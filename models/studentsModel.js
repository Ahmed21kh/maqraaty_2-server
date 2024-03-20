const mongoose = require("mongoose");

const StudentSchema = new mongoose.Schema({
  code:Number,
  name: String,
  phone_1: [String],
  phone_2: [String],
  phone_3: [String],
  study_year:String,
  date:Date,
  is_Azhar:String,
  has_relative:String,
  relative:[String],
  is_payment:String,
  age:Number,
  landline: String,
  address: String,
  notes: String,
  image: String,
  amount:Number
});

const PaymentSchema = new mongoose.Schema({
  amount: Number,
  date: Date,
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'student'
  }
});

const AttendanceSchema = new mongoose.Schema({
  attend_days_month:[Object],
  status:String,
  date:Date,
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'student'
  }
});

module.exports = { StudentSchema , PaymentSchema ,AttendanceSchema }