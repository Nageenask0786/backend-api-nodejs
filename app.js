const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");
const { title } = require("process");
const { request } = require("http");
const app = express();
app.use(express.json());

const port = 3000;

let db = null;
let dbPath = path.join(__dirname, "productData.db");

const fetchApiAndSeedDatabase = async (db) => {
  try {
    const createTableQuery = `CREATE TABLE IF NOT EXISTS product(
      id INTEGER NOT NULL PRIMARY KEY,
      title VARCHAR(250),
      price INTEGER,
      description TEXT,
      category VARCHAR(250),
      image TEXT,
      sold BOOLEAN,
      dateOfSale TEXT
    )`;
    db.run(createTableQuery);
    const checkDatainTable = await db.get(
      `SELECT Count() as count FROM product`
    );
    console.log(checkDatainTable);
    if (checkDatainTable.count > 0) {
      console.log(`Data already exist skip seeding`);
    } else {
      const response = await fetch(
        "https://s3.amazonaws.com/roxiler.com/product_transaction.json"
      );
      const data = await response.json();
      const insertDataQuery = `INSERT INTO product (title, price, description, category, image, sold, dateOfSale)
      VALUES (?, ?, ?, ?, ?, ?, ?)`;
      for (let eachProduct of data) {
        await db.run(insertDataQuery, [
          eachProduct.title,
          eachProduct.price,
          eachProduct.description,
          eachProduct.category,
          eachProduct.image,
          eachProduct.sold,
          new Date(eachProduct.dateOfSale)
            .toISOString()
            .replace("T", " ")
            .slice(0, 19),
        ]);
      }
    }
  } catch (e) {
    console.log(`Some Error Occured ${e.message}`);
  }
};

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    fetchApiAndSeedDatabase(db);
    app.listen(port, () => {
      console.log(`Server Running at Port http://localhost:${port}`);
    });
  } catch (e) {
    console.log(`DB Error ${e.message}`);
  }
};

initializeDbAndServer();

app.get("/transactions/:month", async (request, response) => {
  const { limit = 10, offset = 0, search = "" } = request.query;
  const {month = "01"} = request.params ;
  const parseMonth = parseInt(month) < 10 ? `0${month}` : month;
  const parsedMonth =
    parseMonth.length > 2 ? parseMonth.slice(1, parseMonth.length) : parseMonth;
  const queryParams = [
    `%${search}%`,
    `%${search}%`,
    `%${search}%`,
    `${parsedMonth}`,
    `${limit}`,
    `${offset}`,
  ];
  let getDataQuery = `
      SELECT * FROM product
      WHERE (title LIKE ? OR description LIKE ? OR price LIKE ?) AND strftime("%m",dateOfSale) = ?
      LIMIT ? OFFSET ?`;
  const products = await db.all(getDataQuery, queryParams);
  response.send(products);
});

app.get("/totalSales/:month", async (request, response) => {
  const { month } = request.params;
  console.log(parseInt(month));
  const parseMonth = parseInt(month) < 10 ? `0${month}` : month;
  const parsedMonth =
    parseMonth.length > 2 ? parseMonth.slice(1, parseMonth.length) : parseMonth;
  console.log(parsedMonth);
  if (parseInt(month) > 0 && parseInt(month) <= 12) {
    const getTotalSales = `SELECT strftime('%m', dateOfSale) as month,SUM(price) as totalSales FROM product WHERE strftime("%m",dateOfSale) = ?`;
    const totalSales = await db.get(getTotalSales, [parsedMonth]);
    response.send(totalSales);
  } else {
    response.send("Please Provide Valid Month");
  }
});

app.get("/noOfSoldItems/:month", async (request, response) => {
  const { month } = request.params;
  console.log(parseInt(month));
  const parseMonth = parseInt(month) < 10 ? `0${month}` : month;
  const parsedMonth =
    parseMonth.length > 2 ? parseMonth.slice(1, parseMonth.length) : parseMonth;
  console.log(parsedMonth);
  if (parseInt(month) > 0 && parseInt(month) <= 12) {
    const getTotalSales = `SELECT strftime('%m', dateOfSale) as month, COUNT() as NoOfSoldItems 
    FROM product WHERE strftime("%m",dateOfSale) = ? AND sold = ?`;
    const totalSales = await db.get(getTotalSales, [parsedMonth, true]);
    response.send(totalSales);
  } else {
    response.send("Please Provide Valid Month");
  }
});

app.get("/noOfUnsoldItems/:month", async (request, response) => {
  const { month } = request.params;
  console.log(parseInt(month));
  const parseMonth = parseInt(month) < 10 ? `0${month}` : month;
  const parsedMonth =
    parseMonth.length > 2 ? parseMonth.slice(1, parseMonth.length) : parseMonth;
  console.log(parsedMonth);
  if (parseInt(month) > 0 && parseInt(month) <= 12) {
    const getTotalSales = `SELECT strftime('%m', dateOfSale) as month, COUNT() as NoOfSoldItems 
    FROM product WHERE strftime("%m",dateOfSale) = ? AND sold = ?`;
    const totalSales = await db.get(getTotalSales, [parsedMonth, false]);
    response.send(totalSales);
  } else {
    response.send("Please Provide Valid Month");
  }
});

app.get("/pieChartData/:month", async (request, response) => {
  const { month } = request.params;
  console.log(parseInt(month));
  const parseMonth = parseInt(month) < 10 ? `0${month}` : month;
  const parsedMonth =
    parseMonth.length > 2 ? parseMonth.slice(1, parseMonth.length) : parseMonth;
  console.log(parsedMonth);
  if (parseInt(month) > 0 && parseInt(month) <= 12) {
    const getTotalSales = `SELECT category, COUNT() as noOfItems 
    FROM product WHERE strftime("%m",dateOfSale) = ?
    GROUP BY category`;
    const totalSales = await db.all(getTotalSales, [parsedMonth]);
    response.send(totalSales);
  } else {
    response.send("Please Provide Valid Month");
  }
});

app.get("/",async(request,response)=> {
  response.send("Hello World!")
})