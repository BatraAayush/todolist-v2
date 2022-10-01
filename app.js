const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//connecting to mongoDB through mongoose
main().catch((err) => console.log(err));
async function main() {
  await mongoose.connect("mongodb://localhost:27017/todolistDB");
}

//creating models
const itemsSchema = new mongoose.Schema({
  name: String,
});
const Item = mongoose.model("Item", itemsSchema);
const listSchema = new mongoose.Schema({
  name: String,
  items: [itemsSchema],
});
const List = mongoose.model("List", listSchema);

//creating array of default items
const item1 = new Item({
  name: "Welcome to your todolist!",
});
const item2 = new Item({
  name: "Hit the + button to add a new item.",
});
const item3 = new Item({
  name: "← Hit this to delete an item.",
});
const defaultItems = [item1, item2, item3];

app.get("/", async function (req, res) {
  //inserting default items in db and rendering all items to website from db
  Item.find({}, async function (err, foundItems) {
    if (foundItems.length === 0) {
      await Item.insertMany(defaultItems, function (err, docs) {
        if (err) {
          console.log(err);
        } else {
          console.log("default items added successfully");
        }
      });
      res.redirect("/");
    } else {
      res.render("list", { listTitle: "Today", newListItems: foundItems });
    }
  });
});

//express route parameters for different lists
app.get("/:customListName", async (req, res) => {
  //to show same list for case sensitive lists eg home and Home both will show Home.
  const customListName = _.capitalize(req.params.customListName);
  List.findOne({ name: customListName }, async (err, foundList) => {
    if (!err) {
      if (!foundList) {
        //create a new list
        const list = new List({
          name: customListName,
          items: defaultItems,
        });
        await list.save();
        res.redirect("/" + customListName);
      } else {
        //show an existing list
        res.render("list", {
          listTitle: foundList.name,
          newListItems: foundList.items,
        });
      }
    }
  });
});

app.post("/", async function (req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;
  const item = new Item({
    name: itemName,
  });

  if (listName === "Today") {
    await item.save();
    res.redirect("/");
  } else {
    List.findOne({ name: listName }, async (err, foundList) => {
      foundList.items.push(item);
      await foundList.save();
      res.redirect("/" + listName);
    });
  }
});

app.post("/delete", async function (req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;
  if (listName === "Today") {
    //deleting items from main route list
    await Item.deleteOne({ _id: checkedItemId });
    console.log("successfully deleted checked item.");
    res.redirect("/");
  } else {
    //deleting items from custom todolists
    List.findOneAndUpdate(
      { name: listName },
      { $pull: { items: { _id: checkedItemId } } },
      function (err, foundList) {
        if (!err) {
          res.redirect("/" + listName);
        }
      }
    );
  }
});

app.get("/about", function(req, res){
  res.render("about");
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
