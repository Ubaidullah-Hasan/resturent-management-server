import express from 'express';
import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv'
import cors from 'cors';
dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors())
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.clipjzr.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();



        // mongodb collection
        const menuCollection = client.db("bistroDB").collection("menu");
        const reviewCollection = client.db("bistroDB").collection('reviews');
        const cartCollection = client.db("bistroDB").collection('carts');


        /* ********************************
        Menu Collection
        ******************************** */
        app.get("/menu", async (req, res) => {
            try {
                const result = await menuCollection.find().toArray();
                res.send(result);
            } catch (err) {
                res.status(500).json({ message: 'Error fetching unique categories', error: err.message });
            }
        })

        app.post("/menu", async (req, res) => {
            const {
                name,
                recipe,
                category,
                price,
                image
            } = req.body;

            const recipeData = {
                name: name,
                recipe: recipe,
                category: category,
                price: price,
                image: image,
            }
            // console.log(recipeData);

            try {
                const result = await menuCollection.insertOne(recipeData);
                res.send(result)
            } catch (err) {
                res.status(500).send({ message: 'Error fetching unique categories', error: err.message })
            }

        })


        app.get("/categories", async (req, res) => {
            try {
                // Use aggregation to group by category and count the items in each category
                const pipeline = [
                    {
                        $group: {
                            _id: "$category",
                            totalItems: { $sum: 1 },
                        },
                    },
                    {
                        $sort: {
                            _id: 1, // Sort by category name in ascending order
                        },
                    },
                ];

                const categoryCounts = await menuCollection.aggregate(pipeline).toArray();

                // Format the result to include both category and totalItems
                const result = categoryCounts.map((item) => ({
                    category: item._id,
                    totalItems: item.totalItems,
                }));

                res.send(result);
            } catch (error) {
                console.error("Error fetching categories with item counts:", error);
                res.status(500).send("Internal Server Error");
            }
        });


        app.get("/categories/:categoryName", async (req, res) => {
            const categoryName = req.params.categoryName;
            const query = { category: categoryName };

            // for limit query start
            const limit = parseInt(req.query.limit) || 0;
            const page = parseInt(req.query.page) || 1;
            const skip = (page - 1) * limit;
            // for limit query end

            try {
                if (limit) {
                    // for limit query and also params
                    const result = await menuCollection.find(query).skip(skip).limit(limit).toArray();
                    res.json(result);

                } else {
                    // for only params
                    const result = await menuCollection.find(query).toArray();
                    res.send(result);
                }

            } catch (err) {
                console.error("\n\n/categories/:categoryName", err);
                res.status(500).send("Error fetching category items ");
            }
        })


        app.get('/totalCount/:categoryItems', async (req, res) => {
            const categoryItems = req.params.categoryItems;
            const query = { category: categoryItems };

            try {
                const menuCount = await menuCollection.countDocuments();
                const categoryWiseItemsCount = await menuCollection.countDocuments(query);
                res.send({ menuCount, categoryWiseItemsCount });
            } catch (err) {
                console.error('\n\n route: /totalCount', err);
                res.status(500).send({ message: 'Error fetching count documents' });
            }
        })


        /* ********************************
        Review Collection
        ******************************** */
        app.get("/reviews", async (req, res) => {
            try {
                const result = await reviewCollection.find().toArray();
                res.send(result);
            }
            catch (err) {
                res.status(500).send("Internal Server Error");
            }
        })

        /* ********************************
        Carts Collection
        ******************************** */

        app.get("/carts", async (req, res) => {
            const email = req.query.email;
            try {
                const query = { email: email };
                const result = await cartCollection.find(query).toArray();
                res.send(result);
            } catch (err) {
                console.error("/carts", err);
                res.status(500).send("Internal Server Error");
            }
        })

        app.post('/carts', async (req, res) => {
            const item = req.body;
            // console.log(item);
            try {
                const result = await cartCollection.insertOne(item);
                res.send(result);
            }
            catch (err) {
                console.log('\n\n/carts', err);
                res.status(500).send("Internal Server Error");
            }
        })






        /* ********************************
                Google reCAPTCHA
        ******************************** */
        app.post('/api/verify-recaptcha', async (req, res) => {
            const { recaptchaResponse } = req.body;
            const secretKey = process.env.RECAPTCHA_SECRET_KEY;

            try {
                const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
                const verificationResponse = await fetch(VERIFY_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: `secret=${secretKey}&response=${recaptchaResponse}`,
                });

                const data = await verificationResponse.json();

                console.log(data);

                if (data.success) {
                    console.log('reCAPTCHA verification succeeded');
                    res.json({ success: true, person: "Human 👨 👩" });
                } else {
                    console.log('reCAPTCHA verification failed');
                    res.json({ success: false, person: "Robot 🤖" });
                }
            } catch (error) {
                console.log('catch error');
                // Handle API request error
                console.error('Error verifying reCAPTCHA:', error);
                res.status(500).json({ success: false });
            }
        });




        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get("/", (req, res) => {
    res.send("Server in running!")
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
})