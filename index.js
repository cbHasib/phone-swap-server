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
    app.get("/users/:email", verifyToken, async (req, res) => {
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
    app.put("/users/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
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

    const productCategory = db.collection("productCategory");
    // Product Category Add API
    app.post("/productCategory", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const data = req.body;
        const result = await productCategory.insertOne(data);
        console.log(result);
        if (result.acknowledged && result.insertedId) {
          res.send({
            success: true,
            message: "Product Category Added Successfully",
          });
        } else {
          res.send({
            success: false,
            error: "Product Category Addition Failed",
          });
        }
      } catch (error) {
        res.send({
          success: false,
          error: error.message,
        });
      }
    });

    // Product Category Get API
    app.get("/productCategory", async (req, res) => {
      try {
        const result = await productCategory.find().toArray();
        if (result.length > 0) {
          res.send({
            success: true,
            data: result,
          });
        } else {
          res.send({
            success: false,
            error: "No Product Category Found",
          });
        }
      } catch (error) {
        res.send({
          success: false,
          error: error.message,
        });
      }
    });

    // Category Delete API
    app.delete(
      "/productCategory/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const { id } = req.params;
          const query = { _id: ObjectId(id) };
          const result = await productCategory.deleteOne(query);
          if (result.acknowledged && result.deletedCount > 0) {
            res.send({
              success: true,
              message: "Product Category Deleted Successfully",
            });
          } else {
            res.send({
              success: false,
              error: "Product Category Deletion Failed",
            });
          }
        } catch (error) {
          res.send({
            success: false,
            error: error.message,
          });
        }
      }
    );

    app.get("/get-products", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const result = await products.find({}).sort({ _id: -1 }).toArray();
        if (result.length > 0) {
          res.send({
            success: true,
            data: result,
          });
        } else {
          res.send({
            success: false,
            error: "No Product Found",
          });
        }
      } catch (error) {
        res.send({
          success: false,
          error: error.message,
        });
      }
    });

    // Admin Product Delete API
    app.delete(
      "/products/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const { id } = req.params;
          const query = { _id: ObjectId(id) };
          const result = await products.deleteOne(query);
          if (result.acknowledged && result.deletedCount > 0) {
            res.send({
              success: true,
              message: "Product Deleted Successfully",
            });
          } else {
            res.send({
              success: false,
              error: "Product Deletion Failed",
            });
          }
        } catch (error) {
          res.send({
            success: false,
            error: error.message,
          });
        }
      }
    );

    const verifySellerCollection = db.collection("verifySeller");

    // Seller verification by Admin
    app.put(
      "/seller-verification/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const { id } = req.params;

          const checkVerifySeller = await verifySellerCollection.findOne({
            user_id: id,
          });
          if (!checkVerifySeller) {
            res.send({
              success: false,
              error: "No Request Found",
            });
          }

          const query = { _id: ObjectId(id) };
          const newDocs = { $set: { isVerified: true } };
          const options = { upsert: false };
          const result = await usersCollection.updateOne(
            query,
            newDocs,
            options
          );

          const result2 = await verifySellerCollection.updateOne(
            { user_id: id },
            { $set: { status: "Approved" } },
            { options }
          );

          if (result.modifiedCount === 1 && result2.modifiedCount === 1) {
            res.send({
              success: true,
              message: "Seller Verified Successfully",
            });
          } else {
            res.send({
              success: false,
              error: "Seller Verification Failed",
            });
          }
        } catch (error) {
          res.send({
            success: false,
            error: error.message,
          });
        }
      }
    );

    // Seller verification request delete by Admin
    app.delete(
      "/seller-verification/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const { id } = req.params;
          const query = { user_id: id };
          const result = await verifySellerCollection.deleteOne(query);
          if (result.acknowledged && result.deletedCount > 0) {
            res.send({
              success: true,
              message: "Seller Verification Request Deleted Successfully",
            });
          } else {
            res.send({
              success: false,
              error: "Seller Verification Request Deletion Failed",
            });
          }
        } catch (error) {
          res.send({
            success: false,
            error: error.message,
          });
        }
      }
    );

    // Verify Seller Request Get API
    app.get(
      "/seller-verification",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const result = await verifySellerCollection
            .find()
            .sort({ _id: -1 })
            .toArray();
          if (result.length > 0) {
            res.send({
              success: true,
              data: result,
            });
          } else {
            res.send({
              success: false,
              error: "No Seller Verification Request Found",
            });
          }
        } catch (error) {
          res.send({
            success: false,
            error: error.message,
          });
        }
      }
    );

    // Admin Route API End Here

    // Seller Route API Start Here
    // Seller Product Create API
    app.post("/product", verifyToken, verifySeller, async (req, res) => {
      try {
        const data = req.body;
        const result = await products.insertOne(data);
        if (result.acknowledged && result.insertedId) {
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

    // Seller Product Get API
    app.get(
      "/products/seller/:sellerId",
      verifyToken,
      verifySeller,
      async (req, res) => {
        try {
          const sellerId = req.params.sellerId;
          const query = { seller_id: sellerId };
          const result = await products.find(query).toArray();
          if (result.length > 0) {
            res.send({
              success: true,
              data: result,
            });
          } else {
            res.send({
              success: false,
              error: "No Product Found",
            });
          }
        } catch (error) {
          res.send({
            success: false,
            error: error.message,
          });
        }
      }
    );

    // Seller Product Delete API
    app.delete(
      "/products/seller/:id",
      verifyToken,
      verifySeller,
      async (req, res) => {
        try {
          const { id } = req.params;
          const query = { _id: ObjectId(id) };
          const result = await products.deleteOne(query);
          if (result.acknowledged && result.deletedCount > 0) {
            res.send({
              success: true,
              message: "Product Deleted Successfully",
            });
          } else {
            res.send({
              success: false,
              error: "Product Deletion Failed",
            });
          }
        } catch (error) {
          res.send({
            success: false,
            error: error.message,
          });
        }
      }
    );

    // Seller Promote API
    app.patch(
      "/products/seller/promote/:id",
      verifyToken,
      verifySeller,
      async (req, res) => {
        try {
          const { id } = req.params;
          const query = { _id: ObjectId(id) };
          const newDocs = { $set: { promoted: true } };
          const result = await products.updateOne(query, newDocs, {
            upsert: false,
          });
          if (result.acknowledged && result.modifiedCount > 0) {
            res.send({
              success: true,
              message: "Product Promoted Successfully",
            });
          } else {
            res.send({
              success: false,
              error: "Product Promotion Failed",
            });
          }
        } catch (error) {
          res.send({
            success: false,
            error: error.message,
          });
        }
      }
    );

    // Seller Verification API
    app.post(
      "/users/verification-request/:id",
      verifyToken,
      verifySeller,
      async (req, res) => {
        try {
          const { id } = req.params;
          const query = { user_id: id };

          const seller = await verifySellerCollection.findOne(query);
          if (seller) {
            res.send({
              success: false,
              error: "Verification Request Already Sent",
            });
          } else {
            const data = req.body;
            const { name, image, email, phone } = data;
            const newRequest = {
              user_id: id,
              status: "Pending",
              name,
              image,
              email,
              phone,
              date: new Date(),
            };
            const result = await verifySellerCollection.insertOne(newRequest);
            if (result.acknowledged && result.insertedId) {
              res.send({
                success: true,
                message: "Verification Request Sent Successfully",
              });
            } else {
              res.send({
                success: false,
                error: "Verification Request Failed",
              });
            }
          }
        } catch (error) {
          res.send({
            success: false,
            error: error.message,
          });
        }
      }
    );

    // Seller Route API End Here

    // Product Route API Start Here
    // Get Promoted Products API
    app.get("/products/promoted", async (req, res) => {
      try {
        const query = { promoted: true, status: "Available" };
        const result = await products
          .find(query)
          .sort({ _id: -1 })
          .limit(10)
          .toArray();

        const users = await usersCollection.find({}).toArray();
        const productsWithUsers = result.map((product) => {
          const seller_id = product.seller_id;
          const seller = users.find((user) => user._id == seller_id);
          const seller_isVerified = seller.isVerified;

          return {
            ...product,
            seller_isVerified,
          };
        });

        if (productsWithUsers.length > 0) {
          res.send({
            success: true,
            data: productsWithUsers,
          });
        } else {
          res.send({
            success: false,
            error: "No Promoted Product Found",
          });
        }
      } catch (error) {
        res.send({
          success: false,
          error: error.message,
        });
      }
    });

    // Get Product By Category API
    app.get("/products/category/:cat_id", verifyToken, async (req, res) => {
      try {
        const cat_id = req.params.cat_id;

        if (!cat_id || cat_id == "all") {
          const query = { status: "Available" };
          const result = await products.find(query).sort({ _id: -1 }).toArray();

          const users = await usersCollection.find({}).toArray();
          const productsWithUsers = result.map((product) => {
            const seller_id = product.seller_id;
            const seller = users.find((user) => user._id == seller_id);
            const seller_isVerified = seller.isVerified;

            return {
              ...product,
              seller_isVerified,
            };
          });

          if (productsWithUsers.length > 0) {
            res.send({
              success: true,
              data: productsWithUsers,
            });
          } else {
            res.send({
              success: false,
              error: "No Product Found",
            });
          }

          return;
        }

        const query = { category_id: cat_id };
        const result = await products.find(query).sort({ _id: -1 }).toArray();

        const users = await usersCollection.find({}).toArray();
        const productsWithUsers = result.map((product) => {
          const seller_id = product.seller_id;
          const seller = users.find((user) => user._id == seller_id);
          const seller_isVerified = seller.isVerified;

          return {
            ...product,
            seller_isVerified,
          };
        });

        if (productsWithUsers.length > 0) {
          res.send({
            success: true,
            data: productsWithUsers,
          });
        } else {
          res.send({
            success: false,
            error: "No Product Found",
          });
        }
      } catch (error) {
        res.send({
          success: false,
          error: error.message,
        });
      }
    });

    // product details api end here

    // Buyer Route API Start Here
    const bookingCollection = db.collection("bookings");
    // Book Product API
    app.post("/products/book/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const body = req.body;
        const update = { $set: { status: "Booked" } };
        const query = { _id: ObjectId(id) };
        const result = await products.updateOne(query, update, {
          upsert: false,
        });

        const addBooking = await bookingCollection.insertOne(body);

        if (
          result.acknowledged &&
          result.modifiedCount > 0 &&
          addBooking.acknowledged &&
          addBooking.insertedId
        ) {
          res.send({
            success: true,
            message: "Product Booked Successfully",
          });
        } else {
          res.send({
            success: false,
            error: "Product Booking Failed",
          });
        }
      } catch (error) {
        res.send({
          success: false,
          error: error.message,
        });
      }
    });

    // Get Booked Products API
    app.get("/products/booked/:email", verifyToken, async (req, res) => {
      try {
        const { email } = req.params;
        if (email !== req.user.email) {
          res.status(401).send({
            success: false,
            error: "Unauthorized Access",
          });
          return;
        }

        const query = { buyer_email: email };
        const result = await bookingCollection
          .find(query)
          .sort({ _id: -1 })
          .toArray();
        if (result.length > 0) {
          res.send({
            success: true,
            data: result,
          });
        } else {
          res.send({
            success: false,
            error: "No Booked Product Found",
          });
        }
      } catch (error) {
        res.send({
          success: false,
          error: error.message,
        });
      }
    });

    // Get Single Booked Products API
    app.get("/products/booked/:email/:id", verifyToken, async (req, res) => {
      try {
        const { email, id } = req.params;
        if (email !== req.user.email) {
          res.status(401).send({
            success: false,
            error: "Unauthorized Access",
          });
          return;
        }

        const query = { _id: ObjectId(id) };
        const result = await bookingCollection.findOne(query);
        if (result) {
          res.send({
            success: true,
            data: result,
          });
        } else {
          res.send({
            success: false,
            error: "No Booked Product Found",
          });
        }
      } catch (error) {
        res.send({
          success: false,
          error: error.message,
        });
      }
    });

    // Wishlist API Start Here
    const wishlistCollection = db.collection("wishlist");
    // Add to Wishlist API
    app.post("/wishlist/add/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const checkIsExist = await wishlistCollection.findOne({
          product_id: id,
          buyer_email: req.user.email,
        });
        if (checkIsExist) {
          res.send({
            success: false,
            error: "Product Already Added to Wishlist",
          });
          return;
        }

        const targetProduct = await products.findOne({ _id: ObjectId(id) });
        if (!targetProduct) {
          res.send({
            success: false,
            error: "Product Not Found",
          });
          return;
        }

        const {
          product_name,
          category_id,
          resale_price,
          contact_number,
          condition,
          location,
          years_used,
          description,
          image,
          post_time,
          seller_name,
          seller_id,
        } = targetProduct;

        const wishlistData = {
          product_id: id,
          product_name,
          category_id,
          resale_price,
          contact_number,
          condition,
          location,
          years_used,
          description,
          image,
          post_time,
          seller_name,
          seller_id,
          buyer_email: req.user.email,
        };

        const addWishlist = await wishlistCollection.insertOne(wishlistData);
        if (addWishlist.acknowledged && addWishlist.insertedId) {
          res.send({
            success: true,
            message: "Product Added to Wishlist Successfully",
          });
        } else {
          res.send({
            success: false,
            error: "Product Adding to Wishlist Failed",
          });
        }
      } catch (error) {
        res.send({
          success: false,
          error: error.message,
        });
      }
    });

    // Get wishlist API
    app.get("/wishlist/:email", verifyToken, async (req, res) => {
      try {
        const { email } = req.params;
        if (email !== req.user.email) {
          res.status(401).send({
            success: false,
            error: "Unauthorized Access",
          });
          return;
        }

        const query = { buyer_email: email };
        const result = await wishlistCollection
          .find(query)
          .sort({ _id: -1 })
          .toArray();

        if (result.length > 0) {
          res.send({
            success: true,
            data: result,
          });
        } else {
          res.send({
            success: false,
            error: "No Product Found",
          });
        }
      } catch (error) {
        res.send({
          success: false,
          error: error.message,
        });
      }
    });

    // Get Single wishlist API
    app.get("/wishlist/:email/:id", verifyToken, async (req, res) => {
      try {
        const { email, id } = req.params;
        if (email !== req.user.email) {
          res.status(401).send({
            success: false,
            error: "Unauthorized Access",
          });
          return;
        }

        const query = { _id: ObjectId(id) };
        const result = await wishlistCollection.findOne(query);
        if (result) {
          res.send({
            success: true,
            data: result,
          });
        } else {
          res.send({
            success: false,
            error: "No Product Found",
          });
        }
      } catch (error) {
        res.send({
          success: false,
          error: error.message,
        });
      }
    });

    // Delete wishlist API
    app.delete("/wishlist/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const query = { _id: ObjectId(id) };
        const result = await wishlistCollection.deleteOne(query);
        if (result.deletedCount > 0) {
          res.send({
            success: true,
            message: "Product Deleted from Wishlist Successfully",
          });
        } else {
          res.send({
            success: false,
            error: "Product Deleting from Wishlist Failed",
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
