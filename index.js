const express = require("express");
const body_parser = require("body-parser");
const session = require("express-session");
const multer = require("multer");
const mongoose = require("mongoose");

const app = express();
const router = express.Router(); // Create a router instance

app.use(
  body_parser.urlencoded({
    extended: false,
  })
);

app.use(body_parser.json());

//middleware for serving static files

app.use(express.static("public"));

app.set("view engine", "ejs");
//Set up Session Middleware

app.use(
  session({
    secret: "1234567890abcdefghijklmnopqrstuvwxyz",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// Set up DB connection
mongoose.connect("mongodb://localhost:27017/blogApp");

// Get the default connection
const db = mongoose.connection;

// Handle connection events
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to the database");
});
// Scehma
const userSchema = new mongoose.Schema({
  fname: { type: String, required: true },
  lname: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  status: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
});

const Users = mongoose.model("users", userSchema);

module.exports = Users;

// Schema for Post
const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  imagePath: { type: String, required: true },
  content: { type: String, required: true },
});

const Post = mongoose.model("Post", postSchema);

module.exports = Post;

// Set up Multer for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads"); // Save files to the "uploads" folder in the project root
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// Middleware to fetch all pages and make them available to all views
app.use(async (req, res, next) => {
  try {
    const allPages = await Post.find({});
    res.locals.pages = allPages;
    next();
  } catch (error) {
    console.error("Error retrieving pages:", error);
    res.status(500).send("Internal Server Error");
  }
});

const upload = multer({ storage: storage });

app.get("/", (req, res) => {
  res.render("home", {
    login: true,
    status: "other",
    message: "",
    isLoggedIn: req.session.isLoggedIn,
    isAdmin: req.session.isAdmin,
  });
});
app.get("/home", (req, res) => {
  res.render("home", {
    login: true,
    status: "other",
    message: "",
    isLoggedIn: req.session.isLoggedIn,
    isAdmin: req.session.isAdmin,
  });
});
app.get("/welcome", (req, res) => {
  res.render("welcome", {
    login: true,
    status: "other",
    message: "",
    isLoggedIn: req.session.isLoggedIn,
    isAdmin: req.session.isAdmin,
  });
});

// Login route
app.get("/login", (req, res) => {
  res.render("welcome", {
    login: true,
    status: "other",
    message: "",
    isLoggedIn: req.session.isLoggedIn,
    isAdmin: req.session.isAdmin,
  });
});

// Register route
app.get("/register", (req, res) => {
  res.render("welcome", {
    login: false,
    status: "other",
    message: "",
    isLoggedIn: req.session.isLoggedIn,
    isAdmin: req.session.isAdmin,
  });
});

app.post("/login_submit", async (req, res) => {
  const { email, password } = req.body;
  try {
    // Check if the user exists in the MongoDB collection
    const user = await Users.findOne({ email, password });
    if (user) {
      // Set session variable to indicate the user is logged in
      req.session.isLoggedIn = true;
      req.session.email = email;
      allPages = await Post.find({});
      // Redirect to the dashboard if the user is an admin
      if (user.role === "admin") {
        req.session.isAdmin = true;
        // Retrieve all pages from the database

        return res.render("dashboard", {
          page: "create",
          status: "other",
          message: "",
          pages: allPages,
          isAdmin: req.session.isAdmin,
          isLoggedIn: req.session.isLoggedIn,
        });
      } else {
        req.session.isAdmin = false;
        // Redirect to the welcome page for non-admin users
        return res.render("dashboard", {
          page: "view",
          status: "other",
          message: "",
          pages: allPages,
          isAdmin: req.session.isAdmin,
          isLoggedIn: req.session.isLoggedIn,
        });
      }
    } else {
      res.render("welcome", {
        login: true,
        status: "error",
        message: "Invalid username or password!",
        isLoggedIn: req.session.isLoggedIn,
        isAdmin: req.session.isAdmin,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});
app.post("/register_submit", async (req, res) => {
  const { fname, lname, email, password, role } = req.body;
  try {
    // Check if the user already exists
    const existingUser = await Users.findOne({ email });

    if (existingUser) {
      res.render("welcome", {
        login: false,
        status: "error",
        message: "User with this email already exists!",
        isLoggedIn: req.session.isLoggedIn,
        isAdmin: req.session.isAdmin,
      });
      // res.send('User with this email already exists.');
    } else {
      // Create a new user
      const newUser = new Users({
        fname,
        lname,
        email,
        password,
        role,
        status: 1, // Assuming you have a default status value
      });

      // Save the user to the database
      await newUser.save();

      // Redirect to a success page or login page
      res.render("welcome", {
        login: true,
        status: "success",
        message: "New user is added!",
        isLoggedIn: req.session.isLoggedIn,
        isAdmin: req.session.isAdmin,
      });
    }
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// app.get('/dashboard', async (req, res) => {
//     res.render('dashboard',{page:"create",status:"other",message:"",pages:{}});

// });
app.get("/create_post", async (req, res) => {
  if (req.session.isLoggedIn && req.session.email) {
    try {
      // Retrieve all pages from the database
      allPages = await Post.find({});
      if (req.session.isAdmin == true) {
        res.render("dashboard", {
          page: "create",
          status: "other",
          message: "",
          pages: allPages,
          isAdmin: req.session.isAdmin,
          isLoggedIn: req.session.isLoggedIn,
        });
      } else {
        res.render("dashboard", {
          page: "view",
          status: "other",
          message: "",
          pages: allPages,
          isAdmin: req.session.isAdmin,
          isLoggedIn: req.session.isLoggedIn,
        });
      }
      // Render the view_all_pages EJS template and pass the pages data
    } catch (error) {
      console.error("Error retrieving pages:", error);
      res.status(500).send("Internal Serdfvdfver Error");
    }
  } else {
    res.redirect("/welcome");
  }
});

// Add a new post route
app.post("/post_submit", upload.single("image"), async (req, res) => {
  const { title, content } = req.body;

  const imagePath = "/uploads/" + req.file.filename; 
  allPages = await Post.find({});

  try {
    // Create a new post
    const newPost = new Post({
      title,
      content,
      imagePath,
      // Add any additional fields you want to save for the post
    });

    // Save the post to the database
    await newPost.save();
    res.render("dashboard", {
      page: "create",
      status: "success",
      message: "New Post is created",
      pages: allPages,
      isAdmin: req.session.isAdmin,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (error) {
    res.render("dashboard", {
      page: "create",
      status: "error",
      message: "Internal Server Error",
      pages: {},
      isAdmin: req.session.isAdmin,
      isLoggedIn: req.session.isLoggedIn,
    });
  }
});

// Route to view all pages
app.get("/view_all_pages", async (req, res) => {
  try {
    // Retrieve all pages from the database
    allPages = await Post.find({});

    // Render the view_all_pages EJS template and pass the pages data
    res.render("dashboard", {
      page: "view",
      status: "other",
      message: "",
      pages: allPages,
      isAdmin: req.session.isAdmin,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (error) {
    console.error("Error retrieving pages:", error);
    res.status(500).send("Internal Serdfvdfver Error");
  }
});
app.get("/edit_page/:id", async (req, res) => {
  const pageId = req.params.id;

  try {
    // Retrieve the page from the database using the pageId
    const pageData = await Post.findById(pageId);
    allPages = await Post.find({});
    if (!pageData) {
      // return res.status(404).send('Page not found');
      res.render("dashboard", {
        page: "edit",
        status: "error",
        message: "Page not found!",
        pages: allPages,
        isAdmin: req.session.isAdmin,
        isLoggedIn: req.session.isLoggedIn,
      });
    }

    // Render the edit page form, passing the page data

    res.render("dashboard", {
      page: "edit",
      status: "other",
      message: "",
      pages: allPages,
      pageData: pageData,
      isAdmin: req.session.isAdmin,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (error) {
    console.error("Error retrieving page for editing:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Add this route before your app.listen() statement
app.get("/delete_page/:id", async (req, res) => {
  const pageId = req.params.id;

  try {
    // Delete the page from the database using the pageId
    const deletedPage = await Post.findByIdAndDelete(pageId);

    if (!deletedPage) {
      res.render("dashboard", {
        page: "view",
        status: "error",
        message: "Page not found!",
        pages: {},
        isAdmin: req.session.isAdmin,
        isLoggedIn: req.session.isLoggedIn,
      });
    }
    allPages = await Post.find({});

    // Redirect to the view_all_pages route after deletion
    res.render("dashboard", {
      page: "view",
      status: "error",
      message: "Page is successfully deleted!",
      pages: allPages,
      isAdmin: req.session.isAdmin,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (error) {
    console.error("Error deleting page:", error);
    res.render("dashboard", {
      page: "view",
      status: "error",
      message: "Internal Server Error!",
      pages: {},
      isAdmin: req.session.isAdmin,
      isLoggedIn: req.session.isLoggedIn,
    });
  }
});

// Handle form submission to update a page
router.post("/update_page/:id", upload.single("image"), async (req, res) => {
  const pageId = req.params.id;

  try {
    const page = await Post.findById(pageId);
    allPages = await Post.find({});
    if (!page) {
      return res.status(404).send("Page not found");
    }

    page.title = req.body.title;
    page.content = req.body.content;

    if (req.file) {
      page.imagePath = "/uploads/" + req.file.filename;
    }

    await page.save();

    res.render("dashboard", {
      page: "create",
      status: "success",
      message: "Post is updated",
      pages: allPages,
      isAdmin: req.session.isAdmin,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (error) {
    console.error("Post Submission Error:", error);
    res.render("dashboard", {
      page: "create",
      status: "error",
      message: "Internal Server Error",
      pages: allPages,
      isAdmin: req.session.isAdmin,
      isLoggedIn: req.session.isLoggedIn,
    });
  }
});

// Route to view a single page
app.get("/view_page/:id", async (req, res) => {
  const pageId = req.params.id;

  try {
    // Retrieve the page from the database using the pageId
    const this_pages = await Post.findById(pageId);
    allPages = await Post.find({});

    if (!this_pages) {
      res.render("dashboard", {
        page: "template",
        status: "error",
        message: "Page not found!",
        pages: allPages,
        isAdmin: req.session.isAdmin,
        isLoggedIn: req.session.isLoggedIn,
      });
    }

    // Retrieve all pages from the database

    // Render the view_page EJS template and pass the page data
    res.render("dashboard", {
      page: "template",
      status: "other",
      message: "",
      pages: allPages,
      idPage: this_pages,
      isAdmin: req.session.isAdmin,
      isLoggedIn: req.session.isLoggedIn,
    });
  } catch (error) {
    console.error("Error retrieving page for viewing:", error);
    res.status(500).send("Internal Server Error");
  }
});
// this route to handle logout
app.get("/logout", (req, res) => {
  // Destroy the session
  req.session.destroy((err) => {
    if (err) {
      res.render("home", {
        login: true,
        status: "error",
        message: "Internal Server Error!",
        isLoggedIn: false,
      });
    } else {
      // Redirect to the login page after logout
      res.render("home", {
        login: true,
        status: "other",
        message: "Successfully Logout!",
        isLoggedIn: false,
      });
    }
  });
});

//   Use the router for all routes
app.use("/", router);

app.listen(3000, () => {
  console.log("Server has started on port number 3000");
});
