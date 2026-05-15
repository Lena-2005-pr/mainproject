const express = require("express");
const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

mongoose
  .connect("mongodb+srv://lena_db:lena_db@cluster0.v8uuvxs.mongodb.net/db_homenurse")
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./public/uploads";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

const createFileMeta = (file) => ({
  filePath: `/uploads/${file.filename}`,
  originalName: file.originalname,
  uploadedAt: new Date()
});

const safeParseJson = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
};

const normalizeText = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const normalizeOptionalNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizeFileMeta = (file) => {
  if (!file) return null;

  return {
    filePath: normalizeText(file.filePath),
    originalName: normalizeText(file.originalName) || path.basename(normalizeText(file.filePath)),
    uploadedAt: file.uploadedAt ? new Date(file.uploadedAt) : new Date()
  };
};

const fileMetaSchema = new mongoose.Schema(
  {
    filePath: { type: String, required: true, trim: true },
    originalName: { type: String, required: true, trim: true },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const qualificationSchema = new mongoose.Schema(
  {
    title: { type: String, default: "", trim: true },
    institution: { type: String, default: "", trim: true },
    year: { type: String, default: "", trim: true }
  },
  { _id: false }
);

const specializationSchema = new mongoose.Schema(
  {
    name: { type: String, default: "", trim: true },
    details: { type: String, default: "", trim: true }
  },
  { _id: false }
);

const certificationSchema = new mongoose.Schema(
  {
    name: { type: String, default: "", trim: true },
    issuer: { type: String, default: "", trim: true },
    year: { type: String, default: "", trim: true },
    file: { type: fileMetaSchema, default: null }
  },
  { _id: false }
);

const workHistorySchema = new mongoose.Schema(
  {
    hospitalName: { type: String, default: "", trim: true },
    role: { type: String, default: "", trim: true },
    startDate: { type: String, default: "", trim: true },
    endDate: { type: String, default: "", trim: true },
    details: { type: String, default: "", trim: true }
  },
  { _id: false }
);

const professionalProfileSchema = new mongoose.Schema(
  {
    experienceSummary: { type: String, default: "", trim: true },
    qualifications: { type: [qualificationSchema], default: [] },
    specializations: { type: [specializationSchema], default: [] },
    certifications: { type: [certificationSchema], default: [] },
    workHistory: { type: [workHistorySchema], default: [] }
  },
  { _id: false }
);

const healthInfoSchema = new mongoose.Schema(
  {
    medicalHistory: { type: String, default: "", trim: true },
    currentHealthCondition: { type: String, default: "", trim: true },
    allergies: { type: String, default: "", trim: true },
    ongoingMedication: { type: String, default: "", trim: true }
  },
  { _id: false }
);

const medicalDocumentsSchema = new mongoose.Schema(
  {
    prescriptions: { type: [fileMetaSchema], default: [] },
    reports: { type: [fileMetaSchema], default: [] },
    testResults: { type: [fileMetaSchema], default: [] }
  },
  { _id: false }
);

const emptyHealthInfo = () => ({
  medicalHistory: "",
  currentHealthCondition: "",
  allergies: "",
  ongoingMedication: ""
});

const emptyMedicalDocuments = () => ({
  prescriptions: [],
  reports: [],
  testResults: []
});

const sanitizeArrayEntries = (items, mapper) =>
  ensureArray(items)
    .map(mapper)
    .filter((item) => Object.values(item).some((value) => value !== "" && value !== null));

const parseProfessionalProfile = (body, certificateFiles = []) => {
  const rawProfile = safeParseJson(body.professionalProfile, {});
  const qualifications = sanitizeArrayEntries(rawProfile.qualifications, (item) => ({
    title: normalizeText(item?.title),
    institution: normalizeText(item?.institution),
    year: normalizeText(item?.year)
  }));

  const specializations = sanitizeArrayEntries(rawProfile.specializations, (item) => ({
    name: normalizeText(item?.name),
    details: normalizeText(item?.details)
  }));

  const workHistory = sanitizeArrayEntries(rawProfile.workHistory, (item) => ({
    hospitalName: normalizeText(item?.hospitalName),
    role: normalizeText(item?.role),
    startDate: normalizeText(item?.startDate),
    endDate: normalizeText(item?.endDate),
    details: normalizeText(item?.details)
  }));

  const certifications = ensureArray(rawProfile.certifications)
    .map((item, index) => {
      const uploadIndex =
        item?.uploadIndex !== undefined && item?.uploadIndex !== null
          ? Number(item.uploadIndex)
          : index;
      const uploadedFile =
        Number.isInteger(uploadIndex) && uploadIndex >= 0
          ? certificateFiles[uploadIndex]
          : certificateFiles[index];
      const existingFile =
        normalizeFileMeta(item?.file) ||
        normalizeFileMeta({
          filePath: item?.filePath,
          originalName: item?.originalName,
          uploadedAt: item?.uploadedAt
        });

      return {
        name: normalizeText(item?.name),
        issuer: normalizeText(item?.issuer),
        year: normalizeText(item?.year),
        file: uploadedFile ? createFileMeta(uploadedFile) : existingFile
      };
    })
    .filter((item) => item.name || item.issuer || item.year || item.file);

  return {
    experienceSummary: normalizeText(rawProfile.experienceSummary),
    qualifications,
    specializations,
    certifications,
    workHistory
  };
};

const parseMedicalDocuments = (files) => ({
  prescriptions: ensureArray(files?.prescriptions).map(createFileMeta),
  reports: ensureArray(files?.reports).map(createFileMeta),
  testResults: ensureArray(files?.testResults).map(createFileMeta)
});

const canAccessMonitoring = (bookingStatus) => [2, 4].includes(Number(bookingStatus));

const hideSensitiveBookingForNurse = (bookingDoc) => {
  const booking = bookingDoc?.toObject ? bookingDoc.toObject() : { ...bookingDoc };

  if (!canAccessMonitoring(booking.bookingStatus)) {
    booking.patientAddress = "";
    booking.healthInfo = emptyHealthInfo();
    booking.medicalDocuments = emptyMedicalDocuments();
    booking.patientFile = "";
  }

  return booking;
};

const bookingStatusCounts = (bookings) =>
  bookings.reduce(
    (acc, booking) => {
      acc.total += 1;
      if (booking.bookingStatus === 0) acc.pending += 1;
      if (booking.bookingStatus === 1) acc.accepted += 1;
      if (booking.bookingStatus === 2) acc.paidActive += 1;
      if (booking.bookingStatus === 3) acc.rejected += 1;
      if (booking.bookingStatus === 4) acc.completed += 1;
      return acc;
    },
    { total: 0, pending: 0, accepted: 0, paidActive: 0, rejected: 0, completed: 0 }
  );

const districtSchema = new mongoose.Schema(
  {
    districtname: { type: String, required: true, trim: true }
  },
  { collection: "districts", timestamps: true }
);

const experienceSchema = new mongoose.Schema(
  {
    experiencedate: { type: String, required: true, trim: true },
    experiencedetails: { type: String, required: true, trim: true },
    years: { type: String, required: true, trim: true }
  },
  { collection: "experience", timestamps: true }
);

const adminregSchema = new mongoose.Schema(
  {
    adminName: { type: String, required: true, trim: true },
    adminEmail: { type: String, required: true, trim: true },
    adminPassword: { type: String, required: true, trim: true }
  },
  { collection: "adminreg", timestamps: true }
);

const placeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    districtId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "District",
      required: true
    }
  },
  { collection: "places", timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, required: true, trim: true },
    userPassword: { type: String, required: true, trim: true },
    userAddress: { type: String, required: true, trim: true },
    userPhone: { type: String, required: true, trim: true },
    photo: { type: String, default: "" },
    userPlace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Place",
      required: true
    }
  },
  { collection: "users", timestamps: true }
);

const homenurseSchema = new mongoose.Schema(
  {
    homenurseName: { type: String, required: true, trim: true },
    homenurseEmail: { type: String, required: true, trim: true },
    homenursePassword: { type: String, required: true, trim: true },
    homenurseWage: { type: String, required: true, trim: true },
    homenurseContact: { type: String, required: true, trim: true },
    photo: { type: String, default: "" },
    proof: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending"
    },
    professionalProfile: {
      type: professionalProfileSchema,
      default: () => ({})
    }
  },
  { collection: "homenurses", timestamps: true }
);

const subscriptiontypeSchema = new mongoose.Schema(
  {
    subscriptiontypeName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    duration: { type: Number, required: true }
  },
  { collection: "subscriptiontypes", timestamps: true }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingDate: { type: Date, default: Date.now },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    homenurseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HomeNurse",
      required: true
    },
    patientAge: { type: Number, required: true, min: 0 },
    patientType: {
      type: String,
      required: true,
      enum: [
        "Elderly People",
        "Post Surgery",
        "Disabled People",
        "Bedridden Patient",
        "Chronic Illness",
        "Palliative Care",
        "Child Care",
        "Other"
      ]
    },
    patientAddress: { type: String, default: "", trim: true },
    healthInfo: { type: healthInfoSchema, default: () => ({}) },
    medicalDocuments: { type: medicalDocumentsSchema, default: () => ({}) },
    bookingAmount: { type: Number },
    advanceAmount: { type: Number, default: 0 },
    bookingStatus: {
      type: Number,
      enum: [0, 1, 2, 3, 4],
      default: 0
    },
    patientFile: { type: String, default: "" }
  },
  { collection: "bookings", timestamps: true }
);

const subscriptionSchema = new mongoose.Schema(
  {
    subscriptionDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
    price: { type: Number, required: true },
    subscriptiontypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscriptiontype",
      required: true
    },
    homenurseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HomeNurse",
      required: true
    },
    status: {
      type: Number,
      enum: [0, 1, 2],
      default: 1
    }
  },
  { collection: "subscriptions", timestamps: true }
);

const complaintSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    reply: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["Pending", "Replied"],
      default: "Pending"
    },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

const feedbackSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

const healthRecordSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    homenurseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HomeNurse",
      required: true
    },
    temperatureF: { type: Number, default: null },
    bloodPressureSystolic: { type: Number, default: null },
    bloodPressureDiastolic: { type: Number, default: null },
    heartRateBpm: { type: Number, default: null },
    sugarLevel: { type: Number, default: null },
    notes: { type: String, default: "", trim: true },
    recordedAt: { type: Date, default: Date.now }
  },
  { collection: "healthrecords", timestamps: true }
);

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    homenurseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HomeNurse",
      default: null
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true
    },
    type: {
      type: String,
      enum: [
        "BOOKING_REQUEST",
        "BOOKING_ACCEPTED",
        "ADVANCE_PAID",
        "BOOKING_REJECTED",
        "BOOKING_COMPLETED"
      ],
      required: true
    },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const District = mongoose.model("District", districtSchema);
const Experience = mongoose.model("Experience", experienceSchema);
const AdminReg = mongoose.model("AdminReg", adminregSchema);
const Place = mongoose.model("Place", placeSchema);
const User = mongoose.model("User", userSchema);
const HomeNurse = mongoose.model("HomeNurse", homenurseSchema);
const Subscriptiontype = mongoose.model("Subscriptiontype", subscriptiontypeSchema);
const Booking = mongoose.model("Booking", bookingSchema);
const Subscription = mongoose.model("Subscription", subscriptionSchema);
const Complaint = mongoose.model("Complaint", complaintSchema);
const Feedback = mongoose.model("Feedback", feedbackSchema);
const HealthRecord = mongoose.model("HealthRecord", healthRecordSchema);
const Notification = mongoose.model("Notification", notificationSchema);

app.post("/district", async (req, res) => {
  try {
    const { district } = req.body;
    await District.create({ districtname: district });
    res.json({ msg: "inserted succesfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/district", async (req, res) => {
  try {
    const data = await District.find().sort({ districtname: 1 });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/district/:id", async (req, res) => {
  try {
    await District.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/experience", async (req, res) => {
  try {
    const { experiencedate, experiencedetails, years } = req.body;

    if (!experiencedate || !experiencedetails || !years) {
      return res.status(400).json({ error: "All fields required" });
    }

    await Experience.create({
      experiencedate,
      experiencedetails,
      years
    });

    res.json({ message: "Experience added successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/experience", async (req, res) => {
  try {
    const data = await Experience.find().sort({ createdAt: -1 });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/experience/:id", async (req, res) => {
  try {
    await Experience.findByIdAndDelete(req.params.id);
    res.json({ message: "Experience deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/adminreg", async (req, res) => {
  try {
    const { adminName, adminEmail, adminPassword } = req.body;

    if (!adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    await AdminReg.create({ adminName, adminEmail, adminPassword });
    res.json({ message: "Admin Registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/adminreg", async (req, res) => {
  try {
    const data = await AdminReg.find().sort({ createdAt: -1 });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/adminreg/:id", async (req, res) => {
  try {
    await AdminReg.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/place", async (req, res) => {
  try {
    const { name, districtId } = req.body;
    await Place.create({ name, districtId });
    res.json({ msg: "Place Added Successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/place", async (req, res) => {
  try {
    const data = await Place.find().populate("districtId", "districtname").sort({ name: 1 });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/place/:id", async (req, res) => {
  try {
    await Place.findByIdAndDelete(req.params.id);
    res.json({ msg: "Place deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/place/district/:districtId", async (req, res) => {
  try {
    const data = await Place.find({ districtId: req.params.districtId }).sort({ name: 1 });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/user", upload.single("photo"), async (req, res) => {
  try {
    const { userName, userEmail, userPassword, userAddress, userPhone, userPlace } = req.body;

    if (!userName || !userEmail || !userPassword || !userAddress || !userPhone || !userPlace) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const place = await Place.findById(userPlace);
    if (!place) {
      return res.status(404).json({ error: "Selected place not found" });
    }

    const photo = req.file ? `/uploads/${req.file.filename}` : "";

    await User.create({
      userName,
      userEmail,
      userPassword,
      userAddress,
      userPhone,
      userPlace,
      photo
    });

    res.json({ msg: "User Registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/user", async (req, res) => {
  try {
    const data = await User.find();
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate({
      path: "userPlace",
      populate: {
        path: "districtId",
        model: "District"
      }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/user/:id", upload.single("photo"), async (req, res) => {
  try {
    const { userName, userEmail, userAddress, userPlace, userPhone } = req.body;
    const updateData = {
      userName,
      userEmail,
      userAddress,
      userPlace
    };

    if (userPhone !== undefined) {
      updateData.userPhone = userPhone;
    }

    if (req.file) {
      updateData.photo = `/uploads/${req.file.filename}`;
    }

    await User.findByIdAndUpdate(req.params.id, updateData);
    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/user/changepassword/:id", async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Old password and new password are required" });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.userPassword !== oldPassword) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    user.userPassword = newPassword;
    await user.save();
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.post(
  "/homenurse",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "proof", maxCount: 1 },
    { name: "certificateFiles", maxCount: 20 }
  ]),
  async (req, res) => {
    try {
      const { homenurseName, homenurseEmail, homenursePassword, homenurseWage } = req.body;

      if (!homenurseName || !homenurseEmail || !homenursePassword || !homenurseWage) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const photo = req.files?.photo?.[0] ? `/uploads/${req.files.photo[0].filename}` : "";
      const proof = req.files?.proof?.[0] ? `/uploads/${req.files.proof[0].filename}` : "";
      const professionalProfile = parseProfessionalProfile(req.body, req.files?.certificateFiles || []);

      const nurse = await HomeNurse.create({
        homenurseName,
        homenurseEmail,
        homenursePassword,
        homenurseWage,
        photo,
        proof,
        professionalProfile
      });

      res.json({ msg: "Home nurse Registered successfully", id: nurse._id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.get("/homenurses", async (req, res) => {
  try {
    const nurses = await HomeNurse.find().sort({ createdAt: -1 });
    res.json(nurses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/pending", async (req, res) => {
  try {
    const nurses = await HomeNurse.find({ status: "pending" }).sort({ createdAt: -1 });
    res.json(nurses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put("/approve/:id", async (req, res) => {
  try {
    await HomeNurse.findByIdAndUpdate(req.params.id, { status: "accepted" });
    res.json({ message: "HomeNurse Approved Successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put("/reject/:id", async (req, res) => {
  try {
    await HomeNurse.findByIdAndUpdate(req.params.id, { status: "rejected" });
    res.json({ message: "HomeNurse Rejected Successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put("/homenurse/:id", async (req, res) => {
  try {
    const { status } = req.body;
    await HomeNurse.findByIdAndUpdate(req.params.id, { status }, { returnDocument: "after" });
    res.json({ msg: "Updated Successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/homenurse/:id", async (req, res) => {
  try {
    const nurse = await HomeNurse.findById(req.params.id);
    res.json(nurse);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/homenurse/profile/:id", upload.single("photo"), async (req, res) => {
  try {
    const { homenurseName, homenurseEmail, homenurseWage } = req.body;

    const updateData = {
      homenurseName,
      homenurseEmail,
      homenurseWage
    };

    if (req.file) {
      updateData.photo = `/uploads/${req.file.filename}`;
    }

    await HomeNurse.findByIdAndUpdate(req.params.id, updateData);
    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/homenurse/professional/:id", upload.array("certificateFiles", 20), async (req, res) => {
  try {
    const professionalProfile = parseProfessionalProfile(req.body, req.files || []);

    await HomeNurse.findByIdAndUpdate(req.params.id, {
      professionalProfile
    });

    res.json({ message: "Professional details updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/homenurse/changepassword/:id", async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const nurse = await HomeNurse.findById(req.params.id);

    if (!nurse) {
      return res.status(404).json({ message: "Home nurse not found" });
    }

    if (nurse.homenursePassword !== oldPassword) {
      return res.status(400).json({ message: "Old password incorrect" });
    }

    nurse.homenursePassword = newPassword;
    await nurse.save();
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ userEmail: email, userPassword: password });
  if (user) {
    return res.send({
      role: "user",
      id: user._id,
      name: user.userName,
      message: "Login successful"
    });
  }

  const admin = await AdminReg.findOne({ adminEmail: email, adminPassword: password });
  if (admin) {
    return res.send({
      role: "admin",
      id: admin._id,
      name: admin.adminName,
      message: "Login successful"
    });
  }

  const homenurse = await HomeNurse.findOne({ homenurseEmail: email, homenursePassword: password });
  if (homenurse) {
    if (homenurse.status !== "accepted") {
      return res.status(403).json({
        message: "Your account is not approved by admin yet"
      });
    }

    return res.send({
      role: "homenurse",
      id: homenurse._id,
      name: homenurse.homenurseName,
      message: "Login successful"
    });
  }

  return res.status(401).json({ message: "Invalid email or password" });
});

app.post("/subscriptiontype", async (req, res) => {
  try {
    const { subscriptiontypeName, amount, duration } = req.body;

    if (!subscriptiontypeName || !amount || !duration) {
      return res.status(400).json({ error: "All fields are required" });
    }

    await Subscriptiontype.create({
      subscriptiontypeName,
      amount,
      duration
    });

    res.json({ msg: "Subscription added successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/subscriptiontype", async (req, res) => {
  try {
    const data = await Subscriptiontype.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/subscriptiontype/:id", async (req, res) => {
  try {
    await Subscriptiontype.findByIdAndDelete(req.params.id);
    res.json({ msg: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/admin/dashboard", async (req, res) => {
  try {
    const [usersCount, complaintsCount, feedbackCount, healthRecordsCount, nurses, bookings] = await Promise.all([
      User.countDocuments(),
      Complaint.countDocuments(),
      Feedback.countDocuments(),
      HealthRecord.countDocuments(),
      HomeNurse.find(),
      Booking.find()
    ]);

    const nurseStats = nurses.reduce(
      (acc, nurse) => {
        acc.total += 1;
        if (nurse.status === "pending") acc.pending += 1;
        if (nurse.status === "accepted") acc.accepted += 1;
        if (nurse.status === "rejected") acc.rejected += 1;
        return acc;
      },
      { total: 0, pending: 0, accepted: 0, rejected: 0 }
    );

    res.json({
      users: usersCount,
      complaints: complaintsCount,
      feedback: feedbackCount,
      healthRecords: healthRecordsCount,
      nurses: nurseStats,
      bookings: bookingStatusCounts(bookings)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/approvednurses", async (req, res) => {
  try {
    const activeNurseIds = await Subscription.distinct("homenurseId", { status: 1 });

    const nurses = await HomeNurse.find({
      status: "accepted",
      _id: { $in: activeNurseIds }
    }).sort({ createdAt: -1 });

    res.json(nurses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/booking",
  upload.fields([
    { name: "patientFile", maxCount: 1 },
    { name: "prescriptions", maxCount: 10 },
    { name: "reports", maxCount: 10 },
    { name: "testResults", maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      const {
        fromDate,
        toDate,
        userId,
        homenurseId,
        patientAge,
        patientType,
        patientAddress,
        medicalHistory,
        currentHealthCondition,
        allergies,
        ongoingMedication
      } = req.body;

      if (!fromDate || !toDate || !userId || !homenurseId || patientAge === undefined || !patientType || !patientAddress) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const start = new Date(fromDate);
      const end = new Date(toDate);
      const age = Number(patientAge);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      if (start > end) {
        return res.status(400).json({ message: "From date must be before To date" });
      }

      if (Number.isNaN(age) || age < 0) {
        return res.status(400).json({ message: "Invalid patient age" });
      }

      const [nurse, user] = await Promise.all([
        HomeNurse.findById(homenurseId),
        User.findById(userId)
      ]);

      if (!nurse) {
        return res.status(404).json({ message: "Home nurse not found" });
      }

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const existingBooking = await Booking.findOne({
        homenurseId,
        bookingStatus: { $in: [0, 1, 2] },
        fromDate: { $lte: end },
        toDate: { $gte: start }
      });

      if (existingBooking) {
        return res.status(400).json({
          message: "This nurse is already booked for the selected dates"
        });
      }

      const wage = Number(nurse.homenurseWage || 0);
      const diffTime = end.getTime() - start.getTime();
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const bookingAmount = wage * days;
      const patientFile = req.files?.patientFile?.[0] ? `/uploads/${req.files.patientFile[0].filename}` : "";

      const booking = await Booking.create({
        fromDate: start,
        toDate: end,
        userId,
        homenurseId,
        patientAge: age,
        patientType,
        patientAddress: normalizeText(patientAddress),
        healthInfo: {
          medicalHistory: normalizeText(medicalHistory),
          currentHealthCondition: normalizeText(currentHealthCondition),
          allergies: normalizeText(allergies),
          ongoingMedication: normalizeText(ongoingMedication)
        },
        medicalDocuments: parseMedicalDocuments(req.files),
        bookingAmount,
        bookingStatus: 0,
        patientFile
      });

      await Notification.create({
        homenurseId: booking.homenurseId,
        bookingId: booking._id,
        type: "BOOKING_REQUEST"
      });

      res.status(201).json({
        message: "Booking created successfully",
        data: booking,
        totalAmount: bookingAmount
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.get("/booking/nurse/:id", async (req, res) => {
  try {
    const bookings = await Booking.find({ homenurseId: req.params.id })
      .populate("userId", "userName userEmail userPhone userAddress photo")
      .sort({ createdAt: -1 });

    res.json(bookings.map(hideSensitiveBookingForNurse));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/booking/unavailable/:homenurseId", async (req, res) => {
  try {
    const bookings = await Booking.find({
      homenurseId: req.params.homenurseId,
      bookingStatus: { $in: [0, 1, 2] }
    }).select("fromDate toDate bookingStatus");

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/booking/accept/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.bookingStatus !== 0) {
      return res.status(400).json({
        message: "Only new booking requests can be accepted"
      });
    }

    booking.bookingStatus = 1;
    await booking.save();

    await Notification.create({
      userId: booking.userId,
      bookingId: booking._id,
      type: "BOOKING_ACCEPTED"
    });

    res.json({ message: "Booking accepted successfully", data: booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/booking/reject/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (![0, 1].includes(booking.bookingStatus)) {
      return res.status(400).json({
        message: "This booking cannot be rejected"
      });
    }

    booking.bookingStatus = 3;
    await booking.save();

    await Notification.create({
      userId: booking.userId,
      bookingId: booking._id,
      type: "BOOKING_REJECTED"
    });

    res.json({ message: "Booking rejected successfully", data: booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/user-bookings/:userId", async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.userId })
      .populate("homenurseId")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/booking/advance/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.bookingStatus !== 1) {
      return res.status(400).json({
        message: "Advance can be calculated only after nurse acceptance"
      });
    }

    const advance = booking.bookingAmount * 0.1;
    booking.advanceAmount = advance;
    await booking.save();

    res.json({
      message: "Advance payment calculated successfully",
      advanceAmount: advance,
      data: booking
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/paymentcomplete/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.bookingStatus !== 1) {
      return res.status(400).json({
        message: "Payment can be completed only after booking is accepted"
      });
    }

    const advance = booking.bookingAmount * 0.1;
    booking.advanceAmount = advance;
    booking.bookingStatus = 2;
    await booking.save();

    await Notification.create({
      homenurseId: booking.homenurseId,
      bookingId: booking._id,
      type: "ADVANCE_PAID"
    });

    res.json({
      message: "Advance payment completed successfully",
      advanceAmount: advance,
      data: booking
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/booking/complete/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.bookingStatus !== 2) {
      return res.status(400).json({
        message: "Work can be marked completed only after payment completion"
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const toDate = new Date(booking.toDate);
    toDate.setHours(0, 0, 0, 0);

    if (today < toDate) {
      return res.status(400).json({
        message: "Work can be marked completed only after the booking end date"
      });
    }

    booking.bookingStatus = 4;
    await booking.save();

    await Notification.create({
      userId: booking.userId,
      bookingId: booking._id,
      type: "BOOKING_COMPLETED"
    });

    res.json({
      message: "Work marked as completed",
      data: booking
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/booking/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("userId", "userName userEmail userPhone userAddress")
      .populate("homenurseId");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/booking/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if ([1, 2, 4].includes(booking.bookingStatus)) {
      return res.status(400).json({
        message: "Accepted, paid, or completed bookings cannot be deleted"
      });
    }

    await Booking.findByIdAndDelete(req.params.id);
    res.json({ message: "Booking deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/subscription", async (req, res) => {
  try {
    const { subscriptionId, homenurseId } = req.body;

    if (!subscriptionId || !homenurseId) {
      return res.status(400).json({
        message: "subscriptiontypeId and homenurseId are required"
      });
    }

    const plan = await Subscriptiontype.findById(subscriptionId);
    if (!plan) {
      return res.status(404).json({ message: "Subscription type not found" });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + Number(plan.duration));

    const subscription = await Subscription.create({
      subscriptionDate: startDate,
      endDate,
      price: Number(plan.amount),
      subscriptiontypeId: plan._id,
      homenurseId,
      status: 1
    });

    res.json({
      message: "Subscription added successfully",
      data: subscription
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/complaint", async (req, res) => {
  try {
    const { title, content, userId } = req.body;

    if (!title || !content || !userId) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const newComplaint = new Complaint({
      title,
      content,
      userId
    });

    await newComplaint.save();

    res.status(201).json({
      success: true,
      message: "Complaint submitted successfully",
      data: newComplaint
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.put("/complaint/reply/:id", async (req, res) => {
  try {
    const { reply } = req.body;

    if (!reply) {
      return res.json({
        success: false,
        message: "Reply is required"
      });
    }

    await Complaint.findByIdAndUpdate(req.params.id, {
      reply,
      status: "Replied"
    });

    res.json({
      success: true,
      message: "Reply sent successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.get("/complaint", async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate("userId", "userName userEmail")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: complaints
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.get("/complaint/user/:uid", async (req, res) => {
  try {
    const data = await Complaint.find({
      userId: req.params.uid
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

app.get("/complaint/:id", async (req, res) => {
  try {
    const comp = await Complaint.findById(req.params.id).populate("userId", "userName userEmail");

    if (!comp) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found"
      });
    }

    res.status(200).json({
      success: true,
      data: comp
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.post("/feedback", async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const newFeedback = new Feedback({ title, content });
    await newFeedback.save();

    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      data: newFeedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.get("/feedback", async (req, res) => {
  try {
    const feedbackList = await Feedback.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: feedbackList
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.post("/health-records", async (req, res) => {
  try {
    const {
      bookingId,
      userId,
      homenurseId,
      temperatureF,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      heartRateBpm,
      sugarLevel,
      notes,
      recordedAt
    } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: "Booking is required" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (!canAccessMonitoring(booking.bookingStatus)) {
      return res.status(400).json({
        message: "Health monitoring is available only after payment or completion"
      });
    }

    const payload = {
      bookingId,
      userId: booking.userId,
      homenurseId: booking.homenurseId,
      temperatureF: normalizeOptionalNumber(temperatureF),
      bloodPressureSystolic: normalizeOptionalNumber(bloodPressureSystolic),
      bloodPressureDiastolic: normalizeOptionalNumber(bloodPressureDiastolic),
      heartRateBpm: normalizeOptionalNumber(heartRateBpm),
      sugarLevel: normalizeOptionalNumber(sugarLevel),
      notes: normalizeText(notes),
      recordedAt: recordedAt ? new Date(recordedAt) : new Date()
    };

    if (
      !payload.notes &&
      payload.temperatureF === null &&
      payload.bloodPressureSystolic === null &&
      payload.bloodPressureDiastolic === null &&
      payload.heartRateBpm === null &&
      payload.sugarLevel === null
    ) {
      return res.status(400).json({ message: "Please add at least one health metric or notes" });
    }

    if (userId && String(userId) !== String(booking.userId)) {
      return res.status(400).json({ message: "User does not match booking" });
    }

    if (homenurseId && String(homenurseId) !== String(booking.homenurseId)) {
      return res.status(400).json({ message: "Home nurse does not match booking" });
    }

    const record = await HealthRecord.create(payload);
    res.status(201).json({
      message: "Health record saved successfully",
      data: record
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/health-records/booking/:bookingId", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (!canAccessMonitoring(booking.bookingStatus)) {
      return res.status(403).json({
        message: "Health monitoring is available only after payment or completion"
      });
    }

    const data = await HealthRecord.find({
      bookingId: req.params.bookingId
    })
      .populate("homenurseId", "homenurseName")
      .populate("userId", "userName")
      .sort({ recordedAt: 1, createdAt: 1 });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/health-records/user/:userId", async (req, res) => {
  try {
    const data = await HealthRecord.find({
      userId: req.params.userId
    })
      .populate("homenurseId", "homenurseName")
      .populate("bookingId")
      .sort({ recordedAt: 1, createdAt: 1 });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/notifications/user/:userId", async (req, res) => {
  try {
    const data = await Notification.find({ userId: req.params.userId })
      .populate("bookingId")
      .sort({ createdAt: -1 });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/notifications/nurse/:homenurseId", async (req, res) => {
  try {
    const data = await Notification.find({ homenurseId: req.params.homenurseId })
      .populate("bookingId")
      .sort({ createdAt: -1 });

    res.json(
      data.map((item) => ({
        ...item.toObject(),
        bookingId: item.bookingId ? hideSensitiveBookingForNurse(item.bookingId) : null
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/notifications/read/:id", async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, {
      isRead: true
    });

    res.json({ message: "Notification marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/notifications/read-all/user/:userId", async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.params.userId }, { isRead: true });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/notifications/read-all/nurse/:homenurseId", async (req, res) => {
  try {
    await Notification.updateMany({ homenurseId: req.params.homenurseId }, { isRead: true });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/notifications/unread/user/:userId", async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.params.userId,
      isRead: false
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/notifications/unread/nurse/:homenurseId", async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      homenurseId: req.params.homenurseId,
      isRead: false
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
