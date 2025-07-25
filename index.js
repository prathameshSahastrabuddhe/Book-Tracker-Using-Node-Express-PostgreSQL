import bodyParser from 'body-parser';
import pg from 'pg';
import express from 'express';
import axios from "axios";


const app = express();
const port =3000;


const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "projects",
  password: "Postgres@123",
  port: 5432,
});
db.connect();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended : true}));
app.use(express.static("public"));




// show all books
app.get("/", async (req, res) => {
  try {
     const { rows } = await db.query("SELECT * FROM books ORDER BY id DESC");
    res.render("index", { books: rows });
  } catch (err) {
    
    res.status(500).send("Something went wrong");
  }
});


//SHOW ADD FORM
app.get("/add" , (req,res) =>{
res.render("new");
});



// ADD New BOOK 
app.post("/add", async (req, res) => {
  const { title, author, rating, date_read, notes } = req.body;

  try {
    const response = await axios.get(
      `https://openlibrary.org/search.json?title=${title}&author=${author}`
    );

    const bookData = response.data.docs[0];
    const isbn = bookData?.isbn?.[0];
    const coverId = bookData?.cover_i;

    let cover_url;

    if (isbn) {
      cover_url = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
    } else if (coverId) {
      cover_url = `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
    } else {
      cover_url = "https://via.placeholder.com/150";
    }

    await db.query(
      "INSERT INTO books (title, author, rating, date_read, notes, cover_url) VALUES ($1, $2, $3, $4, $5, $6)",
      [title, author, rating, date_read, notes, cover_url]
    );

    res.redirect("/");
  } catch (error) {
    console.error("Error inserting into DB:", error);
    res.send("Failed to Add Book");
  }
});





// Edit Book
app.get("/edit/:id" ,async (req,res) => {
  const bookId = req.params.id;
  try {
    const {rows} = await db.query("select * from books where id =$1",[bookId]);
    res.render("edit",{book : rows[0]});
  } catch (error) {
    res.send(error);
  }
});




// updated Book
app.post("/edit/:id",async (req ,res) =>{
  const bookId =parseInt(req.params.id);
  const { title, author, rating, date_read, notes } = req.body;

  try {
   await db.query(
      `UPDATE books SET title = $1, author = $2, rating = $3, date_read = $4, notes = $5 WHERE id = $6`,
      [title, author, rating, date_read, notes, bookId]
    );
    res.redirect("/");
  } catch (err) {
    console.error("Error updating book:", err);
    res.status(500).send("Failed to update book");
  }
});





// Delete the books
app.post("/delete/:id" ,async(req,res) => {
  const bookId = req.params.id;
  try {
    await db.query("delete from books where id=$1",[bookId]);
    res.redirect("/");
  } catch (error) {
    res.send("Error in deletion");
  }
});


// search the book
app.get("/search", async (req, res) => {
  const query = req.query.q;
  console.log("Search query:", query);

  if (!query || query.trim() === "") {
    return res.redirect("/");
  }

  try {
    const { rows } = await db.query(
      `SELECT * FROM books WHERE title ILIKE $1 OR author ILIKE $1 ORDER BY id ASC`,
      [`%${query}%`]
    );

    res.render("index", { books: rows, q: query });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).send("Something went wrong while searching");
  }
});




// Recently Added
app.get("/recent", async (req,res) =>{
  try {
    const {rows} = await db.query("SELECT * FROM books order by date_read DESC;")
    res.render("index",{books : rows})
  } catch (error) {
    res.send(error);
  }
  
});



// Top Rated
app.get("/rating", async (req,res) =>{
  try {
    const {rows} = await db.query("SELECT * FROM books order by rating DESC;")
    res.render("index",{books : rows})
  } catch (error) {
    res.send(error);
  }
  
});




// Read More
app.get("/book/:id" ,async (req,res) =>{
  const bookId =req.params.id;
  try {
    const {rows} = await db.query("SELECT * FROM books where id = $1;",[bookId]);
    res.render("readmore",{book:rows[0]})
  } catch (error) {
    res.send(error);
  }
});




//START THE SERVER
app.listen(port ,() => {
    console.log(`Server running on http://localhost:${port}`);
})