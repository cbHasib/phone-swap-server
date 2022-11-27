const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, Admin, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  res.send("PhoneSwap Server is running");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.pkcv1zd.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// Verify JWT Token Middleware Start Here
function verifyToken(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization) {
    res.status(401).send({
      success: false,
      error: "Unauthorized Access",
    });
    return;
  }

  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      res.status(403).send({
        success: false,
        error: "Forbidden Access",
      });
      return;
    }
    req.user = decoded;
    next();
  });
}
// Verify JWT Token Middleware End Here

async function run() {
  try {
    const db = client.db(`${process.env.DB_NAME}`);

    // Verify Admin Role Middleware Start Here
    const verifyAdmin = async (req, res, next) => {
      const email = req.user.email;
      const result = await db.collection("users").findOne({ email: email });
      if (result.role === "admin") {
        next();
      } else {
        res.status(403).send({
          success: false,
          error: "Admin Access Only",
        });
        return;
      }
    };
    // Verify Admin Role Middleware End Here

    // Verify Seller Role Middleware Start Here
    const verifySeller = async (req, res, next) => {
      const email = req.user.email;
      const result = await db.collection("users").findOne({ email: email });
      if (result.role === "seller") {
        next();
      } else {
        res.status(403).send({
          success: false,
          error: "Seller Access Only",
        });
        return;
      }
    };
    // Verify Seller Role Middleware End Here

    // Verify Buyer Role Middleware Start Here
    const verifyBuyer = async (req, res, next) => {
      const email = req.user.email;
      const result = await db.collection("users").findOne({ email: email });
      if (result.role === "buyer") {
        next();
      } else {
        res.status(403).send({
          success: false,
          error: "Seller Access Only",
        });
        return;
      }
    };
    // Verify Buyer Role Middleware End Here

    const products = db.collection("products");

    // User Collection MongoDB CRUD Operations Start Here
    const usersCollection = db.collection("users");

    // JWT Token Assign
    app.get("/token", async (req, res) => {
      const { email } = req.query;

      if (!email || !email.includes("@")) {
        res.send({
          status: 400,
          message: "Email is required",
          success: false,
        });
        return;
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign(
          { email: user.email },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "7day" }
        );
        res.send({
          success: true,
          token: token,
        });
      } else {
        res.send({
          success: false,
          error: "User not found",
        });
      }
    });
    // JWT Token Assign End Here

    // User Management Start Here
    // Create User
    app.put("/users", async (req, res) => {
      try {
        const user = req.body;
        const { email } = user;

        const query = { email: email };
        const option = { upsert: true };
        const newDocs = { $set: user };

        const result = await usersCollection.updateOne(query, newDocs, option);

        if (result.acknowledged) {
          res.send({
            success: true,
            message: "User Created Successfully",
          });
        } else {
          res.send({
            success: false,
            message: "User Creation Failed",
          });
        }
      } catch (error) {
        res.send({
          success: false,
          error: error.message,
        });
      }
    });

    // Get User Role By Email Address
    app.get("/users/role/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const result = await usersCollection.findOne(query);
        if (result) {
          res.send({
            success: true,
            name: result.name,
            role: result.role,
          });
        } else {
          res.send({
            success: false,
            error: "User not found",
          });
        }
      } catch (error) {
        res.send({
          success: false,
          error: error.message,
        });
      }
    });

    // User Management End Here

    // Admin Route API Start Here
    // Dashboard Stats API
    app.get("/dashboard", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const productCount = await products.estimatedDocumentCount();
        const adminCount = (
          await usersCollection.find({ role: "admin" }).toArray()
        ).length;
        const sellerCount = (
          await usersCollection.find({ role: "seller" }).toArray()
        ).length;
        const buyerCount = (
          await usersCollection.find({ role: "buyer" }).toArray()
        ).length;
        const totalUserCount = await usersCollection.estimatedDocumentCount();

        res.send({
          success: true,
          data: {
            productCount,
            sellerCount,
            buyerCount,
            totalUserCount,
            adminCount,
          },
        });
      } catch (error) {
        res.send({
          success: false,
          error: error.message,
        });
      }
    });

    // Get User by Role
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const { role } = req.query;
        if (role) {
          if (role === "admin") {
            const result = await usersCollection
              .find({ role: "admin" })
              .toArray();
            if (result.length > 0) {
              res.send({
                success: true,
                data: result,
              });
            } else {
              res.send({
                success: false,
                error: "No Admin Found",
              });
            }
            return;
          } else if (role === "buyer") {
            const result = await usersCollection
              .find({ role: "buyer" })
              .toArray();
            if (result.length > 0) {
              res.send({
                success: true,
                data: result,
              });
            } else {
              res.send({
                success: false,
                error: "No Buyer Found",
              });
            }
            return;
          } else if (role === "seller") {
            const result = await usersCollection
              .find({ role: "seller" })
              .toArray();
            if (result.length > 0) {
              res.send({
                success: true,
                data: result,
              });
            } else {
              res.send({
                success: false,
                error: "No Seller Found",
              });
            }
            return;
          } else {
            res.send({
              success: false,
              error: "Invalid Role",
            });
            return;
          }
        }
        const result = await usersCollection.find().toArray();
        if (result.length > 0) {
          res.send({
            success: true,
            data: result,
          });
        } else {
          res.send({
            success: false,
            error: "No User Found",
          });
        }
      } catch (error) {
        res.send({
          success: false,
          error: error.message,
        });
      }
    });

    // get user by id
    app.get("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const result = await usersCollection.findOne(query);
        if (result) {
          res.send({
            success: true,
            data: result,
          });
        } else {
          res.send({
            success: false,
            error: "User not found",
          });
        }
      } catch (error) {
        res.send({
          success: false,
          error: error.message,
        });
      }
    });

    // Delete User by ID
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const { id } = req.params;
        const query = { _id: ObjectId(id) };
        const result = await usersCollection.deleteOne(query);
        if (result.deletedCount === 1) {
          res.send({
            success: true,
            message: "User Deleted Successfully From Database",
          });
        } else {
          res.send({
            success: false,
            error: "User Deletion Failed From Database",
          });
        }
      } catch (error) {
        res.send({
          success: false,
          error: error.message,
        });
      }
    });

    // User Role Update by ID to Admin
    app.put("/users/admin/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const query = { _id: ObjectId(id) };
        const newDocs = { $set: { role: "admin" } };
        const result = await usersCollection.updateOne(query, newDocs);
        if (result.modifiedCount === 1) {
          res.send({
            success: true,
            message: "User Role Updated to Admin Successfully",
          });
        } else {
          res.send({
            success: false,
            error: "User Role Update to Admin Failed",
          });
        }
      } catch (error) {
        res.send({
          success: false,
          error: error.message,
        });
      }
    });

    // User Verification by ID
    app.put("/users/verify/:id", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const { id } = req.params;
        const query = { _id: ObjectId(id) };
        const newDocs = { $set: { isVerified: true } };
        const result = await usersCollection.updateOne(query, newDocs);
        if (result.modifiedCount === 1) {
          res.send({
            success: true,
            message: "User Verified Successfully",
          });
        } else {
          res.send({
            success: false,
            error: "User Verification Failed",
          });
        }
      } catch (error) {
        res.send({
          success: false,
          error: error.message,
        });
      }
    });

    // Admin Route API End Here

    // Seller Route API Start Here
    // Seller Product Create API
    app.post("/products", verifyToken, verifySeller, async (req, res) => {
      try {
        const data = req.body;
        const result = await products.insertOne(data);
        if (result.acknowledged && result.insertedCount > 0) {
          res.send({
            success: true,
            message: "Product Added Successfully",
          });
        } else {
          res.send({
            success: false,
            error: "Product Addition Failed",
          });
        }
      } catch (error) {
        res.send({
          success: false,
          error: error.message,
        });
      }
    });

    //
  } finally {
  }
}
run().catch((error) => console.error(error));

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
