import { Router } from "express";
import { Polar } from "@polar-sh/sdk";

console.log("POLAR ROUTES FILE:", import.meta.url);

const router = Router();

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: "production",
});

router.post("/checkout", async (req, res) => {
  try {
    console.log("POLAR_SUCCESS_URL:", process.env.POLAR_SUCCESS_URL);

    const checkout = await polar.checkouts.create({
      products: ["1aae7445-2b15-4146-abb0-42f8fb9e679e"],
      successUrl: process.env.POLAR_SUCCESS_URL,
    });

    console.log("POLAR CHECKOUT CREATED:", checkout.id);
    console.log("POLAR CHECKOUT URL:", checkout.url);

    res.json({
      url: checkout.url,
      checkoutId: checkout.id,
      successUrl: process.env.POLAR_SUCCESS_URL,
    });
  } catch (error) {
    console.error("Polar checkout error:", error);
    res.status(500).json({ message: "Unable to create Polar checkout" });
  }
});

// NEW: fetch a checkout's real details by ID (used by the success page)
router.get("/checkout/:checkoutId", async (req, res) => {
  try {
    const checkout = await polar.checkouts.get({ id: req.params.checkoutId });
    // TODO: log this once and check exact field names in your Polar dashboard/console
    // (e.g. customerName vs customer.name, totalAmount vs amount) and adjust the
    // frontend mapping in PaymentSuccess.jsx if they differ.
    console.log("POLAR CHECKOUT DETAILS:", checkout);
    res.json(checkout);
  } catch (error) {
    console.error("Polar checkout fetch error:", error);
    res.status(500).json({ message: "Unable to fetch checkout details" });
  }
});

export default router;
