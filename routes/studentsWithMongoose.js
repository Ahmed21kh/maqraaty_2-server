const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const bodyParser = require("body-parser");
const url = "mongodb://127.0.0.1:27017/Maqraaty";
const {
  StudentSchema,
  PaymentSchema,
  AttendanceSchema,
} = require("../models/studentsModel");
const objectId = require("mongodb").ObjectId;
let schema = mongoose.Schema;
const AutoIncrementFactory = require("mongoose-sequence");

// const studentSchema = new schema({
//   name: String,
//   phone_1: String,
//   phone_2: String,
//   landline: String,
//   address: String,
//   notes: String,
//   image: String,
// });

const Payment = mongoose.model("payment", PaymentSchema);
const Attendance = mongoose.model("attendance", AttendanceSchema);
const Student = mongoose.model("student", StudentSchema);
function generateSixDigits() {
  return Math.floor(100000 + Math.random() * 900000);
}
mongoose.connect(url, { useBigInt64: false }).then((clientdb) => {
  // console.log(clientdb);
  //Read students data
  router.get("/students", async (req, res) => {
    // const {page , limit } = req.query;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;
    await Student.aggregate([
      {
        $match: {},
      },
      {
        $facet: {
          metaData: [
            {
              $count: "total",
            },
            {
              $addFields: {
                pageNumber: Number(page),
                totalPages: { $ceil: { $divide: ["$total", limit] } },
              },
            },
          ],
          data: [
            {
              $skip: Number((page - 1) * limit),
            },
            {
              $limit: Number(limit),
            },
          ],
        },
      },
    ])
      .then((data) => {
        console.log(data);
        let result = data[0];
        result.metaData = {
          ...data[0].metaData[0],
          count: data[0]?.data?.length,
        };
        res.status(200).send(result);
      })
      .catch((e) => {
        res.status(500).json({ message: e.message });
      });
  });
  //get one user
  router.get("/one_student", async (req, res) => {
    const { Id } = req.query;
    let user = await Student.findById(new objectId(Id)).exec();
    console.log("res ====>", res);
    res.status(200).send(user);
  });
  //get all names of students
  router.get("/students_name", async (req, res) => {
    let user = await Student.find().exec();
    // console.log(user);
    // let data = user.map((data) => {
    //   return { _id: data._id, name: data.name };
    // });
    console.log("user ====>", user);
    res.status(200).send(user);
  });

  //Upload image
  router.post("/upload-image", upload.single("file"), (req, res) => {
    console.log(req.file);
    if (req.file.size > 1024 * 1024 * 50) {
      res.status(413).json({
        message: "file is too large please upload file smaller than 50mb",
      });
    } else {
      res.send(req.file);
    }
  });

  //Add new student Data
  router.post(
    "/add_student",
    bodyParser.json({ extended: true }),
    async (req, res) => {
      console.log(req.body);
      //   Student.createIndexes({ code: 1 }, (err) => {
      //     if (err) console.error(err);
      //   });
      // Student.listIndexes((err, indexes) => {
      //   if (err) console.error(err);
      //   console.log(indexes);
      // });
      // studentSchema.pre('save', function(next) {
      //   var doc = this;
      //   counter.findByIdAndUpdate({_id:"studentId"}, {$inc: { seq: 1} }, function(error, counter)   {
      //       if(error)
      //           return next(error);
      //       doc.code = counter.seq;
      //       next();
      //   });
      // });
      const data = await Student.find();
      if (req.body) {
        await Student.create({ code: data.length + 1, ...req.body }).then(
          (data) => {
            console.log("data", data);
            // clientdb.disconnect()
            res.status(200).json({ message: "student added success", data });
          }
        );
      } else {
        res.status(400).json({ message: "no data found" });
      }
    }
  );

  //Update one student Data
  router.put(
    "/update_student",
    bodyParser.json({ extended: true }),
    (req, res) => {
      console.log(req.body);
      console.log(req.query?.id);
      console.log(req.params);

      if (req.body) {
        Student.findByIdAndUpdate(new objectId(req.query?.id), req.body).then(
          (value) => {
            console.log(value);
            //  clientdb.disconnect()
            res.status(200).json({ message: "student updated successfuly" });
          }
        );
      } else {
        res.status(400).json({ message: "no data found" });
      }
    }
  );
  //search of data
  router.get("/search_student", async (req, res) => {
    console.log(req.query?.code);
    console.log(req.query?.name);
    console.log(req.query?.phone);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;
    console.log(
      Object.keys(req.query)
        .filter((value) => value !== undefined)
        .map((d) => {
          {
            return d;
          }
        })
    );
    const filter = Object.keys(req.query)
      .filter((value) => value !== undefined)
      .map((d) => {
        if (d == "name") {
          {
            return { name: { $in: new RegExp(req.query[d], "i") } };
          }
        } else if (d == "phone") {
          {
            return {
              $or: [
                { phone_1: { $in: new RegExp(req.query[d], "i") } },
                { phone_2: { $in: new RegExp(req.query[d], "i") } },
                { phone_3: { $in: new RegExp(req.query[d], "i") } },
              ],
            };
          }
        } else if (d == "code") {
          {
            return { code: Number(req.query[d]) };
          }
        } else {
          console.log("filter done");
        }
      });
    console.log(filter);
    let filterOp;
    if (filter.filter((d) => d !== undefined).length > 0) {
      filterOp = { $and: filter.filter((d) => d !== undefined) };
    } else {
      filterOp = {};
    }
    console.log("filterOp ===", filterOp);
    const queryName = new RegExp(req.query?.name, "i");
    const queryPhone = new RegExp(req.query?.phone, "i");
    // const querCode = new objectId(req.query?.code);
    const totalDoc = await Student.find(filterOp);
    await Student.find(filterOp)
      .skip((page - 1) * limit)
      .limit(limit)
      .then((value) => {
        console.log("data ===", value);
        //  clientdb.disconnect()
        res.status(200).json({
          metaData: {
            total: totalDoc?.length,
            pageNumber: page,
            totalPages: Math.ceil(totalDoc?.length / limit),
            count: value?.length,
          },
          data: value,
        });
      })
      .catch((e) => {
        res.status(500).json({ message: e.message });
      });
  });

  //delete one student Data
  router.delete("/delete_student", (req, res) => {
    console.log(req.body);
    console.log(req.query?.id);
    console.log(req.params);
    if (req.query?.id) {
      Student.findByIdAndDelete(new objectId(req.query?.id)).then((value) => {
        console.log(value);
        //  clientdb.disconnect()
        res.status(200).json({ message: "student deleted successfuly" });
      });
    } else {
      res.status(400).json({ message: "no data found" });
    }
  });

  //Add new payment
  router.post(
    "/add_payment",
    bodyParser.json({ extended: true }),
    async (req, res) => {
      const amount = Number(req.body.amount);
      const date = req.body.date;
      const student = req.query.studentId;
      await Payment.create({ amount, date, student })
        .then((data) => {
          console.log(data);
          res.status(200).json({ message: "Payment added success", data });
        })
        .catch((err) => {
          res.status(400).json({ message: err.message });
        });
    }
  );

  //Get payments
  router.get("/get_payments", async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;
    const matchData = (e) => {
      if (e !== "" && e !== "undefined") {
        return {
          date: new Date(e),
        };
      } else {
        return {};
      }
    };
    // const matchData = Object.keys(req.query).filter(value => value !== undefined).map(d => {
    //   if (d == "date"){
    //     return {date:req.query[d]}
    //   }else {
    //     return {}
    //   }
    // })
    console.log(matchData(req.query.date));
    const totalAmounts = await Payment.aggregate([
      {     
        
        $match: matchData(req.query.date),
      },
      {
        $group: {
          _id: null, // Group all documents together
          totalAmount: { $sum: "$amount" } // Sum the 'amount' field
        }
      }
     ]);
     // Convert the totalAmounts to a map for easy lookup
    //  const totalAmountMap = new Map(totalAmounts.map(item => [item._id.toString(), item.totalAmount]));
     console.log(totalAmounts[0]?.totalAmount);
    await Payment.aggregate([
      {
        $match: matchData(req.query.date),
      },
      {
        $lookup: {
          from: 'students', // Name of the other collection
          localField: 'student', // Field from the attendance documents
          foreignField: '_id', // Field from the students documents
          as: 'studentDetails' // Output array field
        }
     },
     {
      $unwind: {
        path: "$studentDetails", // Unwind the studentDetails array
        preserveNullAndEmptyArrays: false // Optional: Exclude documents without a match
      }
   },
   {
      $addFields: {
        studentDetails: "$studentDetails" // Move studentDetails back to top level
      }
   },
      {
        $facet: {
          metaData: [
            {
              $count: "total"
            },
            {
              $addFields: {
                pageNumber: Number(page),
                totalPages: { $ceil: { $divide: ["$total", limit] } },
              },
            },
          ],
          data: [
            {
              $skip: Number((page - 1) * limit),
            },
            {
              $limit: Number(limit),
            },
          ],
        },
      },
    ])
      .then((data) => {
        console.log(data);
        let result = data[0];
        result.metaData = {
          ...data[0].metaData[0],
          count: data[0]?.data?.length,
          totalAmount:totalAmounts[0]?.totalAmount
        };
        res.status(200).send(result);
      })
      .catch((e) => {
        res.status(500).json({ message: e.message });
      });
  });


 //Get payment by id
 router.get("/get_one_payment", async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 5;
  const {studentId} = req.query
  const matchData = (e) => {
    if (e !== "" && e !== "undefined") {
      return {
        date: new Date(e),
      };
    } else {
      return {};
    }
  };
  // const matchData = Object.keys(req.query).filter(value => value !== undefined).map(d => {
  //   if (d == "date"){
  //     return {date:req.query[d]}
  //   }else {
  //     return {}
  //   }
  // })
  // console.log(matchData(req.query.date));
  const totalAmounts = await Payment.aggregate([
    {
      $match: {student:new objectId(studentId)},
    },
    {
      $group: {
        _id: null, // Group all documents together
        totalAmount: { $sum: "$amount" } // Sum the 'amount' field
      }
    }
   ]);
   const studentDetails = await Student.aggregate([
    {
      $match: {_id:new objectId(studentId)},
    },
    // {
    //   $group: {
    //     _id: null, // Group all documents together
    //     totalAmount: { $sum: "$amount" } // Sum the 'amount' field
    //   }
    // }
   ]);
   // Convert the totalAmounts to a map for easy lookup
  //  const totalAmountMap = new Map(totalAmounts.map(item => [item._id.toString(), item.totalAmount]));
   console.log(totalAmounts[0]?.totalAmount);
  await Payment.aggregate([
    {
      $match: {student:new objectId(studentId)},
    },
    {
      $lookup: {
        from: 'students', // Name of the other collection
        localField: 'student', // Field from the attendance documents
        foreignField: '_id', // Field from the students documents
        as: 'studentDetails' // Output array field
      }
   },
   {
    $unwind: {
      path: "$studentDetails", // Unwind the studentDetails array
      preserveNullAndEmptyArrays: false // Optional: Exclude documents without a match
    }
 },
 {
    $addFields: {
      studentDetails: "$studentDetails" // Move studentDetails back to top level
    }
 },
    {
      $facet: {
        metaData: [
          {
            $count: "total"
          },
          {
            $addFields: {
              pageNumber: Number(page),
              totalPages: { $ceil: { $divide: ["$total", limit] } },
            },
          },
        ],
        data: [
          {
            $skip: Number((page - 1) * limit),
          },
          {
            $limit: Number(limit),
          },
        ],
      },
    },
  ])
    .then((data) => {
      console.log(data);
      let result = data[0];
      result.metaData = {
        ...data[0].metaData[0],
        count: data[0]?.data?.length,
        totalAmount:totalAmounts[0]?.totalAmount,
        studentDetails:studentDetails[0]
      };
      res.status(200).send(result);
    })
    .catch((e) => {
      res.status(500).json({ message: e.message });
    });
});

  //delete one Payment Data
  router.delete("/delete_payment", (req, res) => {
    console.log(req.body);
    console.log(req.query?.id);
    console.log(req.params);
    if (req.query?.id) {
      Payment.findByIdAndDelete(new objectId(req.query?.id)).then(
        (value) => {
          console.log(value);
          //  clientdb.disconnect()
          res.status(200).json({ message: "Payment deleted successfuly" });
        }
      );
    } else {
      res.status(400).json({ message: "no data found" });
    }
  });

  //Update one payment Data
  router.put(
    "/update_payment",
    bodyParser.json({ extended: true }),
    (req, res) => {
      console.log(req.body);
      console.log(req.query?.id);
      console.log(req.params);

      if (req.body) {
        Payment.findByIdAndUpdate(new objectId(req.query?.id), req.body).then(
          (value) => {
            console.log(value);
            //  clientdb.disconnect()
            res.status(200).json({ message: "payment updated successfuly" });
          }
        );
      } else {
        res.status(400).json({ message: "no data found" });
      }
    }
  );

  //Get Attendance
  router.get("/get_attendance", async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;
    const matchData = (e) => {
      if (e !== "" && e !== "undefined") {
        return {
          date: {
            $lte: new Date(e), // Start date
            // $lte: new Date(e) // End date
          },
        };
      } else {
        return {};
      }
    };
    // const matchData = Object.keys(req.query).filter(value => value !== undefined).map(d => {
    //   if (d == "date"){
    //     return {date:req.query[d]}
    //   }else {
    //     return {}
    //   }
    // })
    console.log(matchData(req.query.date));
    await Attendance.aggregate([
      {
        $match: matchData(req.query.date),
      },
      {
        $lookup: {
          from: 'students', // Name of the other collection
          localField: 'student', // Field from the attendance documents
          foreignField: '_id', // Field from the students documents
          as: 'studentDetails' // Output array field
        }
     },
     {
      $unwind: {
        path: "$studentDetails", // Unwind the studentDetails array
        preserveNullAndEmptyArrays: false // Optional: Exclude documents without a match
      }
   },
   {
      $addFields: {
        studentDetails: "$studentDetails" // Move studentDetails back to top level
      }
   },
      {
        $facet: {
          metaData: [
            {
              $count: "total",
            },
            {
              $addFields: {
                pageNumber: Number(page),
                totalPages: { $ceil: { $divide: ["$total", limit] } },
              },
            },
          ],
          data: [
            {
              $skip: Number((page - 1) * limit),
            },
            {
              $limit: Number(limit),
            },
          ],
        },
      },
    ])
      .then((data) => {
        console.log("attendance ===>",data);
        let result = data[0];
        result.metaData = {
          ...data[0].metaData[0],
          count: data[0]?.data?.length,
        };
        res.status(200).send(result);
      })
      .catch((e) => {
        res.status(500).json({ message: e.message });
      });
  });

  //Add new Attendance
  router.post(
    "/add_attendance",
    bodyParser.json({ extended: true }),
    async (req, res) => {
      const attend_days_month = req.body.attend_days_month;
      const student = req.query.studentId;
      await Attendance.create({...req.body,student:req.query.studentId})
        .then((data) => {
          console.log(data);
          res.status(200).json({ message: "Attendance added success", data });
        })
        .catch((err) => {
          res.status(400).json({ message: err.message });
        });
    }
  );


    //Update one Attendance Data
    router.put(
      "/update_attendance",
      bodyParser.json({ extended: true }),
      (req, res) => {
        console.log(req.body);
        console.log(req.query?.id);
        console.log(req.params);
  
        if (req.body) {
          Attendance.findByIdAndUpdate(new objectId(req.query?.id), req.body).then(
            (value) => {
              console.log(value);
              //  clientdb.disconnect()
              res.status(200).json({ message: "Attendance updated successfuly" });
            }
          );
        } else {
          res.status(400).json({ message: "no data found" });
        }
      }
    );
  
  //delete one Attendance Data
  router.delete("/delete_attendance", (req, res) => {
    // console.log(req.body);
    console.log(req.query?.id);
    // console.log(req.params);
    if (req.query?.id) {
      Attendance.findByIdAndDelete(new objectId(req.query?.id)).then(
        (value) => {
          console.log(value);
          //  clientdb.disconnect()
          res.status(200).json({ message: "Attendance deleted successfuly" });
        }
      );
    } else {
      res.status(400).json({ message: "no data found" });
    }
  });

   //Get Reports
   router.get("/reports", async (req, res) => {
    const {startDate , endDate} = req.query
   
    const matchData = () => {
      if (startDate !== "" && endDate !== "") {
        return {
          date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        };
      } else {
        return {};
      }
    };
    // const matchData = Object.keys(req.query).filter(value => value !== undefined).map(d => {
    //   if (d == "date"){
    //     return {date:req.query[d]}
    //   }else {
    //     return {}
    //   }
    // })
    console.log(matchData());
    const amountOfAllStudents = await Student.aggregate([
      {
        $group: {
          _id: null, // Group all documents together
          totalAmount: { $sum: "$amount" } // Sum the 'amount' field
        }
      }
    ])
   await Payment.aggregate([
      {     
        
        $match: matchData(),
      },
      {
        $group: {
          _id: null, // Group all documents together
          totalAmount: { $sum: "$amount" }, // Sum the 'amount' field
        }
      }
     ])
      .then((data) => {
        console.log(data);
        let newData = {
          ...data[0],amountOfAllStudents:amountOfAllStudents[0]?.totalAmount
        }
        res.status(200).send(newData);
      })
      .catch((e) => {
        res.status(500).json({ message: e.message });
      });
  });
});

module.exports = router;
