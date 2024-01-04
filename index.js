import express from 'express';
import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv'
import cors from 'cors';
dotenv.config()
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

        app.get("/menu", async (req, res) => {
            try {
                const result = await menuCollection.find().toArray();
                res.send(result);
            } catch (err) {
                res.status(500).json({ message: 'Error fetching unique categories', error: err.message });
            }
        })

        app.get("/categories", async (req, res) => {
            try {
                const options = {
                    // Include only the `category` fields in each returned document
                    projection: { _id: 0, category: 1 },
                };

                const allItems = await menuCollection.find({}, options).toArray();
                const uniqueCategories = [...new Set(allItems.map(item => item.category))];
                res.send(uniqueCategories);
            } catch (error) {
                console.error("Error fetching distinct categories:", error);
                res.status(500).send("Internal Server Error");
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