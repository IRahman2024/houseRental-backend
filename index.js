const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const express = require('express')
const cors = require('cors');
const SSLCommerzPayment = require('sslcommerz-lts');
const app = express()
const port = process.env.port || 5000

app.use(express.json());
app.use(cors());


const uri = process.env.mongodb;
// const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
const user = { name: 'sallu', age: 25 };

// database names
const database = client.db("rentals");

// collection
const userCollection = database.collection('allUsers');
const houseCollection = database.collection('houseList');
const complainCollection = database.collection('complains');
const reservationCollection = database.collection('reservation');
const transactionCollection = database.collection('transaction');

// sslcommerce code bellow

const store_id = process.env.storeId //later
const store_passwd = process.env.apiKey// later
const is_live = false //true for live, false for sandbox

//sslcommerz init
// app.get('/init', (req, res) => {
//   const data = {
//     total_amount: 100,
//     currency: 'BDT',
//     tran_id: 'REF123', // use unique tran_id for each api call
//     success_url: 'http://localhost:3030/success',
//     fail_url: 'http://localhost:3030/fail',
//     cancel_url: 'http://localhost:3030/cancel',
//     ipn_url: 'http://localhost:3030/ipn',
//     shipping_method: 'Courier',
//     product_name: 'Computer.',
//     product_category: 'Electronic',
//     product_profile: 'general',
//     cus_name: 'Customer Name',
//     cus_email: 'customer@example.com',
//     cus_add1: 'Dhaka',
//     cus_add2: 'Dhaka',
//     cus_city: 'Dhaka',
//     cus_state: 'Dhaka',
//     cus_postcode: '1000',
//     cus_country: 'Bangladesh',
//     cus_phone: '01711111111',
//     cus_fax: '01711111111',
//     ship_name: 'Customer Name',
//     ship_add1: 'Dhaka',
//     ship_add2: 'Dhaka',
//     ship_city: 'Dhaka',
//     ship_state: 'Dhaka',
//     ship_postcode: 1000,
//     ship_country: 'Bangladesh',
//   };
//   const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
//   sslcz.init(data).then(apiResponse => {
//     // Redirect the user to payment gateway
//     let GatewayPageURL = apiResponse.GatewayPageURL
//     res.redirect(GatewayPageURL)
//     console.log('Redirecting to: ', GatewayPageURL)
//   });
// })

// payment data will come here (payment api)
app.post('/myPayment/:id', async (req, res) => {
  const id = req.params.id;
  // const paymentData = req.body;

  const paymentQuery = { _id: new ObjectId(id) }

  const paymentData = await reservationCollection.findOne(paymentQuery);

  // console.log(paymentData);
  const trans_id = new ObjectId().toString(); // Generate a unique transaction ID
  const data = {
    total_amount: paymentData.totalRent,
    currency: 'BDT',
    tran_id: trans_id, // use unique tran_id for each api call
    success_url: `http://localhost:5000/payment/success/${trans_id}`,
    fail_url: `http://localhost:5000/fail/${trans_id}`,
    cancel_url: 'http://localhost:3030/cancel',
    ipn_url: 'http://localhost:3030/ipn',
    shipping_method: 'Courier',
    product_name: paymentData.houseName,
    product_category: paymentData.type,
    product_profile: 'general',
    cus_name: paymentData.firstName + ' ' + paymentData.lastName,
    cus_email: paymentData.userEmail,
    cus_country: 'Bangladesh',
    cus_add1: 'Dhaka',
    cus_add2: 'Dhaka',
    cus_city: 'Dhaka',
    cus_state: 'Dhaka',
    cus_postcode: '1000',
    cus_country: 'Bangladesh',
    cus_phone: '01711111111',
    cus_fax: '01711111111',
    ship_name: 'Customer Name',
    ship_add1: 'Dhaka',
    ship_add2: 'Dhaka',
    ship_city: 'Dhaka',
    ship_state: 'Dhaka',
    ship_postcode: 1000,
    ship_country: 'Bangladesh',
    payment_date: new Date().toLocaleString()
  };
  console.log(data);
  const finalOrder = {
    paymentData, data, paidStatus: false, transactionId: trans_id
  }

  const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
  sslcz.init(data).then(apiResponse => {
    // Redirect the user to payment gateway
    let GatewayPageURL = apiResponse.GatewayPageURL
    res.send({ url: GatewayPageURL })
    console.log('Redirecting to: ', GatewayPageURL)
  });

  app.post(`/payment/success/:transId`, async (req, res) => {
    const transId = req.params.transId;
    // adding payment transcript to db
    const result = await transactionCollection.insertOne(
      {
        paymentData, data, transactionId: transId
      }
    );

    // confirms reservation and updating reservation db
    const reservationFixed = await reservationCollection.updateOne(
      {
        _id: new ObjectId(paymentData._id)
      },
      {
        $set: {
          paidStatus: true
        }
      },
      { upsert: true }
    );

    console.log(result, reservationFixed);
    // res.send('Payment successful', '<script>window.close()</script>');
    //  this is the trap it will close the window after payment success
    res.send(`
      <html>
          <body>
              <h1>Payment Successful</h1>
              <script>
                  window.close();
              </script>
          </body>
      </html>
  `);

    if (result.modifiedCount) {
      res.send('Payment successful', transId);
    }

  })

  // res.send(data);
})






app.get('/', (req, res) => {
  res.send('user management server running');
})

app.listen(port, () => {
  console.log('this server is running on port: ', { port });
})


// Create a MongoClient with a MongoClientOptions object to set the Stable API version

async function run() {
  try {
    await client.connect();

    await client.db("admin").command({ ping: 1 });
    houseCollection.updateMany(
      {}, // Empty filter to match all documents
      { $rename: { "bathRooms": "bathrooms" } }
    );
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

app.get('/allUsers', async (req, res) => {
  // const userCollection = database.collection('allUsers');
  const cursor = userCollection.find();
  const result = await cursor.toArray()

  res.send(result);
})

app.get('/getRole', async (req, res) => {
  // console.log('hit');

  const email = req.query.email;
  // console.log(email);

  const query = { email: email };
  const user = await userCollection.findOne(query);
  const role = (user?.role || 'no role found');
  // console.log(role);


  res.send(role);
});

app.patch('/updateRole/:id', async (req, res) => {
  const id = req.params.id;
  const role = req.body.role;

  console.log(id, role);
  

  const updatedRole = req.body.role;
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: { role: updatedRole }
  };
  const result = await userCollection.updateOne(filter, updateDoc);
  res.send(result);

})

app.get('/getId', async (req, res) => {
  const email = req.query.email;

  const query = { email: email };
  const user = await userCollection.findOne(query);

  res.send(user);
})

app.get('/allUsersEmail', async (req, res) => {
  const userCollection = database.collection('allUsers');
  const options = {
    projection: { email: 1 }
  };
  const cursor = userCollection.find({}, options);
  const result = await cursor.toArray()

  const email = result.map(user => user.email);

  res.send(email);
})

app.post('/addUser', async (req, res) => {
  const doc = req.body;
  const result = await userCollection.insertOne(doc);
  res.send(result);
})

app.post('/addHouse', async (req, res) => {
  // console.log('api hit');
  const doc = req.body;
  const database = client.db("rentals");
  const houseCollection = database.collection("houseList");

  const result = await houseCollection.insertOne(doc);

  // console.log(result);
  res.send(result);
})

app.get('/allApartments', async (req, res) => {
  const query = { houseType: 'apartment', status: 'approved' };
  const cursor = houseCollection.find(query);
  const result = await cursor.toArray()

  res.send(result);
})

app.get('/allSuites', async (req, res) => {
  const query = { houseType: 'suite', status: 'approved' };
  const cursor = houseCollection.find(query);
  const result = await cursor.toArray()

  res.send(result);
})

app.get('/allDuplex', async (req, res) => {
  const query = { houseType: 'duplex', status: 'approved' };
  const cursor = houseCollection.find(query);
  const result = await cursor.toArray()

  res.send(result);
})

app.put('/updateStatus', async (req, res) => {
  const id = req.query.id;
  const data = req.body;

  const filter = { _id: new ObjectId(id) };
  const options = { upsert: true };
  const updateDoc = {
    $set: {
      status: data.status
    }
  };

  const result = await houseCollection.updateOne(filter, updateDoc, options);

  // console.log(result);
  res.send(result);
})

// app.get('/allHouse', async (req, res) => {

//   const database = client.db("rentals");
//   const houseCollection = database.collection("houseList");
//   const cursor = houseCollection.find();

//   const result = await cursor.toArray()
//   // console.log(result);

//   const array = result.map(house => {
//     const query = { email: house.email };
//     const user = userCollection.findOne(query);
//     house.user = user;
//   });


//   res.send(array);
// })

app.get('/houseDetail/:houseId/:ownerId', async (req, res) => {
  const houseId = req.params.houseId;
  const ownerId = req.params.ownerId;
  // console.log(id);
  const houseQuery = { _id: new ObjectId(houseId) }
  const ownerQuery = { _id: new ObjectId(ownerId) }

  const house = await houseCollection.findOne(houseQuery);
  const owner = await userCollection.findOne(ownerQuery);
  const result = {
    ...house, owner: owner
  }
  res.send(result);
})

app.get('/allHouse', async (req, res) => {
  try {
    const database = client.db("rentals");
    const houseCollection = database.collection("houseList");
    const userCollection = database.collection("allUsers");

    // Get all houses first
    const houses = await houseCollection.find().toArray();

    // Extract all unique emails to fetch users in one batch
    const emails = [...new Set(houses.map(house => house.email))];

    // Fetch all relevant users at once
    const users = await userCollection.find({ email: { $in: emails } }).toArray();

    // console.log(users);


    // Create a map for quick lookups
    const userMap = users.reduce((map, user) => {
      map[user.email] = user;
      return map;
    }, {});

    // Join the data
    const result = houses.map(house => ({
      ...house,
      user: userMap[house.email] || null
    }));

    res.send(result);
  } catch (error) {
    console.error("Error fetching all houses:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get('/houseOfOwner', (req, res) => {
  const email = req.query.email;
  // console.log(email);

  const database = client.db("rentals");
  const houseCollection = database.collection("houseList");

  const query = { email: email };
  const cursor = houseCollection.find(query);
  cursor.toArray().then(result => {
    res.send(result);
  })
})

app.post('/addComplain', async (req, res) => {
  const doc = req.body;
  // console.log(doc);

  const database = client.db("rentals");
  const reviewCollection = database.collection("complains");

  const result = await reviewCollection.insertOne(doc);

  res.send(result);
})

app.get('/allComplains', async (req, res) => {
  const reviewCollection = client.db("rentals").collection("complains");;
  const cursor = reviewCollection.find();
  const result = await cursor.toArray();
  res.send(result);
})

app.get('/transactions/:userEmail', async (req, res) => {
  const userEmail = req.params.email;
  const query = { userEmail: userEmail };
  const cursor = transactionCollection.find(query);
  const result = await cursor.toArray();
  res.send(result);
})

async function getComplainsByEmail(email) {
  try {
    // Find houses matching the email
    const houses = await houseCollection.find({ email: email }).toArray();

    if (!houses || houses.length === 0) {
      return []; // No matching houses, return empty array
    }

    // Extract houseIds from the found houses
    const houseIds = houses.map(house => house._id);
    // console.log(houseIds.map(id => id.toString()));


    // Find reviews matching any of the houseIds
    const complains = await database.collection('complains').find({
      houseId: { $in: houseIds.map(id => id.toString()) }
    }).toArray();

    // console.log(complains);


    return complains;

  }
  catch (error) {
    console.error("Error fetching reviews:", error);
    throw error; // Rethrow the error for handling in the API endpoint
  }
}

app.get('/complains-by-email', async (req, res) => {
  const { email } = req.query; // Assuming you're passing email as a query parameter

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const complains = await getComplainsByEmail(email);
    res.json(complains);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post('/review', async (req, res) => {
  const doc = req.body;
  // console.log(doc);

  const database = client.db("rentals");
  const reviewCollection = database.collection("review");

  const result = await reviewCollection.insertOne(doc);

  res.send(result);
})

app.get('/reviews/:houseId', async (req, res) => {
  const houseId = req.params.houseId;
  // console.log(houseId);

  const database = client.db("rentals");
  const reviewCollection = database.collection("review");

  const query = { houseId: houseId };
  const cursor = reviewCollection.find(query);
  const result = await cursor.toArray();

  res.send(result);
})

app.get('/userReviews/:id', async (req, res) => {
  const id = req.params.id;
  console.log(id);
  const database = client.db("rentals");
  const reviewCollection = database.collection("review");
  const query = { userId: id };
  const cursor = reviewCollection.find(query);
  const result = await cursor.toArray();

  res.send(result);

})

app.get('/allReviews', async (req, res) => {
  const reviewCollection = client.db("rentals").collection("review");;
  const cursor = reviewCollection.find();
  const result = await cursor.toArray();
  res.send(result);
})

async function getReviewsByEmail(email) {
  try {
    // Find houses matching the email
    const houses = await houseCollection.find({ email: email }).toArray();

    if (!houses || houses.length === 0) {
      return []; // No matching houses, return empty array
    }

    // Extract houseIds from the found houses
    const houseIds = houses.map(house => house._id);
    // console.log(houseIds.map(id => id.toString()));


    // Find reviews matching any of the houseIds
    const reviews = await database.collection('review').find({
      houseId: { $in: houseIds.map(id => id.toString()) }
    }).toArray();

    // console.log(reviews);


    return reviews;

  }
  catch (error) {
    console.error("Error fetching reviews:", error);
    throw error; // Rethrow the error for handling in the API endpoint
  }
}

app.get('/reviews-by-email', async (req, res) => {
  const { email } = req.query; // Assuming you're passing email as a query parameter

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const reviews = await getReviewsByEmail(email);
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get('/getReservedDates-email/:email', async (req, res) => {
  const email = req.params.email;
  // console.log(id);

  const database = client.db("rentals");
  const reservationCollection = database.collection("reservation");

  const query = { userEmail: email };
  const cursor = reservationCollection.find(query);
  const result = await cursor.toArray();
  // const result2 = await complainCollection.updateMany(
  //   { },
  //   { $set: { userEmail: "fahim@fahim.com", ownerEmail: "khalid@khalid.com" } }
  // );

  res.send(result);
}
)

app.get('/getDues/:email', async (req, res) => {
  const email = req.params.email;
  // console.log(id);

  const database = client.db("rentals");
  const reservationCollection = database.collection("reservation");

  const query = {
    userEmail: email, $or: [
      { paidStatus: { $exists: false } },
      { paidStatus: false }
    ]
  };
  const cursor = reservationCollection.find(query);
  const result = await cursor.toArray();

  res.send(result);
})

// ownerBookings
app.get('/getReservedDates-house/:email', async (req, res) => {
  const email = req.params.email;
  // console.log(id);

  const database = client.db("rentals");
  const reservationCollection = database.collection("reservation");

  const query = { ownerEmail: email };
  const cursor = reservationCollection.find(query);
  const result = await cursor.toArray();
  // const result2 = await reservationCollection.updateMany(
  //   { },
  //   { $set: { ownerEmail: "khalid@khalid.com" } }
  // );

  res.send(result);
})

app.delete('/deleteReservation/:id', async (req, res) => {
  const id = req.params.id;
  // console.log(id);

  const database = client.db("rentals");
  const reservationCollection = database.collection("reservation");

  const query = { _id: new ObjectId(id) };
  const result = await reservationCollection.deleteOne(query);

  res.send(result);
})

app.get('/getReservedDates/:id', async (req, res) => {
  const id = req.params.id;
  // console.log(id);

  const database = client.db("rentals");
  const reservationCollection = database.collection("reservation");

  const query = { houseId: id };
  const cursor = reservationCollection.find(query);
  const result = await cursor.toArray();
  const bookingDates = result.map(({ from, to }) => ({ from, to }));
  // console.log(bookingDates);


  res.send(bookingDates);
})

app.post('/addReservation', async (req, res) => {
  const doc = req.body;
  console.log(doc);

  const database = client.db("rentals");
  const reservationCollection = database.collection("reservation");

  const result = await reservationCollection.insertOne(doc);

  res.send(result);
})

run().catch(console.dir);
