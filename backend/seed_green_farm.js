require("dotenv").config();
const mongoose = require("mongoose");
const Farm = require("./models/Farm");
const Expense = require("./models/Expense");
const Income = require("./models/Income");

// ── Configuration ──────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/farm-management";
const FARM_NAME = "Green Farm";

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        const farm = await Farm.findOne({ farmName: FARM_NAME });
        if (!farm) {
            console.log(`❌ Farm "${FARM_NAME}" not found. Please create it first.`);
            process.exit(1);
        }

        const userId = farm.userId;

        // ── Seed Crops (Standardized Names) ───────────────────────────
        // Allowed: rice, coconut, banana, pepper, rubber, arecanut, tapioca, cardamom, coffee, cashew, ginger, turmeric, maize, groundnut, sugarcane, vegetables_general, mango, pineapple, jackfruit, tea, cocoa
        farm.crops = [
            { name: "rubber", season: "Perennial", status: "Growing", allocatedArea: 2.0, sownDate: new Date("2018-05-10") },
            { name: "coconut", season: "Perennial", status: "Growing", allocatedArea: 1.0, sownDate: new Date("2020-03-15") },
            { name: "pepper", season: "Perennial", status: "Growing", allocatedArea: 0.5, sownDate: new Date("2021-06-20") },
            { name: "rice", season: "Monsoon", status: "Harvested", allocatedArea: 1.5, sownDate: new Date("2024-06-01"), expectedHarvestDate: new Date("2024-11-15"), removalDate: new Date("2024-11-20") },
            { name: "tapioca", season: "Summer", status: "Harvested", allocatedArea: 1.0, sownDate: new Date("2025-02-01"), expectedHarvestDate: new Date("2025-10-10"), removalDate: new Date("2025-10-15") },
            { name: "banana", season: "Perennial", status: "Growing", allocatedArea: 0.8, sownDate: new Date("2025-01-10") },
            { name: "ginger", season: "Monsoon", status: "Harvested", allocatedArea: 0.4, sownDate: new Date("2025-05-15"), expectedHarvestDate: new Date("2025-12-05"), removalDate: new Date("2025-12-10") },
            { name: "vegetables_general", season: "Winter", status: "Growing", allocatedArea: 0.3, sownDate: new Date("2026-01-05"), expectedHarvestDate: new Date("2026-04-10") }
        ];

        await farm.save();
        console.log(`✅ Crops updated (${farm.crops.length} crops using standardized names)`);

        // ── Seed Expenses (Standardized Crop Names) ───────────────────
        await Expense.deleteMany({ farmId: farm._id });
        console.log("🗑  Cleared existing expenses");

        const rawExpenses = [
            // 2024 – rice (previously Paddy)
            { cropName: "rice", category: "Seeds", title: "rice seeds (Uma variety)", amount: 3200, expenseDate: new Date("2024-06-10") },
            { cropName: "rice", category: "Fertilizer", title: "Urea – first dose", amount: 1800, expenseDate: new Date("2024-07-01") },
            { cropName: "rice", category: "Labor", title: "Transplanting labor", amount: 5000, expenseDate: new Date("2024-06-20") },
            { cropName: "rice", category: "Labor", title: "Harvesting labor", amount: 6000, expenseDate: new Date("2024-11-15") },

            // 2025 – tapioca
            { cropName: "tapioca", category: "Seeds", title: "tapioca stakes", amount: 1500, expenseDate: new Date("2025-02-05") },
            { cropName: "tapioca", category: "Labor", title: "Land preparation", amount: 4200, expenseDate: new Date("2025-02-10") },
            { cropName: "tapioca", category: "Labor", title: "Harvesting labor", amount: 4500, expenseDate: new Date("2025-10-08") },

            // 2025 – ginger
            { cropName: "ginger", category: "Seeds", title: "ginger seed rhizomes", amount: 8000, expenseDate: new Date("2025-05-15") },
            { cropName: "ginger", category: "Fertilizer", title: "Neem cake", amount: 2200, expenseDate: new Date("2025-06-30") },
            { cropName: "ginger", category: "Labor", title: "Harvesting labor", amount: 4000, expenseDate: new Date("2025-12-10") },

            // 2025 – banana
            { cropName: "banana", category: "Fertilizer", title: "banana bunch spray", amount: 1100, expenseDate: new Date("2025-03-10") },
            { cropName: "banana", category: "Labor", title: "Propping labor", amount: 2000, expenseDate: new Date("2025-07-15") },

            // 2026 – vegetables_general (previously Bitter Gourd)
            { cropName: "vegetables_general", category: "Seeds", title: "Vegetable seed mix", amount: 650, expenseDate: new Date("2026-01-03") },
            { cropName: "vegetables_general", category: "Labor", title: "Sowing labor", amount: 2500, expenseDate: new Date("2026-01-05") },
            { cropName: "vegetables_general", category: "Irrigation", title: "Drip setup", amount: 1800, expenseDate: new Date("2026-02-01") },

            // Perennials Maintenance
            { cropName: "rubber", category: "Labor", title: "Tapping labor (monthly avg)", amount: 5000, expenseDate: new Date("2026-01-15") },
            { cropName: "coconut", category: "Labor", title: "Coconut plucking", amount: 1500, expenseDate: new Date("2026-02-10") },
            { cropName: "pepper", category: "Fertilizer", title: "Pepper vine manure", amount: 1200, expenseDate: new Date("2026-01-20") }
        ];

        const expenseData = rawExpenses.map(e => ({ ...e, farmId: farm._id, userId }));
        await Expense.insertMany(expenseData);
        console.log(`✅ Inserted ${expenseData.length} expense records`);

        // ── Seed Income (Standardized Crop Names) ───────────────────
        if (Income) {
            await Income.deleteMany({ farmId: farm._id });
            console.log("🗑  Cleared existing income records");

            const incomeData = [
                { farmId: farm._id, userId, cropName: "rice", quantity: 850, pricePerUnit: 22, totalAmount: 18700, soldDate: new Date("2024-11-28"), notes: "rice sale" },
                { farmId: farm._id, userId, cropName: "tapioca", quantity: 1200, pricePerUnit: 15, totalAmount: 18000, soldDate: new Date("2025-10-15"), notes: "tapioca sale" },
                { farmId: farm._id, userId, cropName: "ginger", quantity: 400, pricePerUnit: 140, totalAmount: 56000, soldDate: new Date("2025-12-10"), notes: "ginger harvest sale" },
                { farmId: farm._id, userId, cropName: "banana", quantity: 450, pricePerUnit: 35, totalAmount: 15750, soldDate: new Date("2025-08-20"), notes: "banana bunches sale" },
                { farmId: farm._id, userId, cropName: "banana", quantity: 380, pricePerUnit: 38, totalAmount: 14440, soldDate: new Date("2026-01-12"), notes: "banana sale" },
                { farmId: farm._id, userId, cropName: "pepper", quantity: 80, pricePerUnit: 600, totalAmount: 48000, soldDate: new Date("2026-02-15"), notes: "pepper sale" },
                { farmId: farm._id, userId, cropName: "coconut", quantity: 500, pricePerUnit: 15, totalAmount: 7500, soldDate: new Date("2026-02-28"), notes: "coconut sale" },
                { farmId: farm._id, userId, cropName: "rubber", quantity: 120, pricePerUnit: 160, totalAmount: 19200, soldDate: new Date("2026-01-25"), notes: "rubber sheet sale" }
            ];
            await Income.insertMany(incomeData);
            console.log(`✅ Inserted ${incomeData.length} income records`);
        }

        console.log("\n🌾 Seeding complete with standardized crop names! Green Farm is ready.");
        await mongoose.disconnect();
    } catch (err) {
        console.error("❌ Seeding failed:", err);
        process.exit(1);
    }
}

seed();
