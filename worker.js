export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    console.log(`Incoming request to: ${url.pathname}`);

    // 1) /api/contactForm
    if (url.pathname === "/api/contactForm" && request.method === "POST") {
      console.log("Route matched: /api/contactForm (POST)");
      return handleContactForm(request, env);
    }

    // 2) /api/packageForm
    if (url.pathname === "/api/packageForm" && request.method === "POST") {
      console.log("Route matched: /api/packageForm (POST)");
      return handlePackageForm(request, env);
    }

    // No matching route => 404
    console.log(`No matching route for ${url.pathname} - returning 404`);
    return new Response("Not found", { status: 404 });
  },
};

// CONTACT FORM
async function handleContactForm(request, env) {
  try {
    const data = await request.json();
    console.log("Contact form data:", data);

    const emailjsResponse = await sendEmail(
      env.CONTACT_FORM_TEMPLATE_ID,
      {
        contact_number: Math.floor(Math.random() * 1000000),
        user_name: data.user_name,
        user_email: data.user_email,
        user_phone: data.user_phone,
        user_country: data.user_country,
        message: data.message,
        device_type: data.deviceType,
        preferred_player: data.preferredPlayer,
      },
      env
    );

    if (!emailjsResponse.ok) {
      const errText = await emailjsResponse.text();
      console.error("Eroare la EmailJS (contact):", errText);
      return new Response("Eroare la EmailJS: " + errText, { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("handleContactForm ERROR:", err);
    return new Response("Server error contactForm: " + err.message, {
      status: 500,
    });
  }
}

// PACKAGE FORM
async function handlePackageForm(request, env) {
  try {
    const data = await request.json();
    console.log("Package form data:", data);

    // Debug: Show EXACT strings we got from the front end
    console.log("planName =", JSON.stringify(data.planName));
    console.log("durationOption =", JSON.stringify(data.durationOption));

    const stripeLink = findStripeLink(data.planName, data.durationOption);
    if (!stripeLink) {
      console.error(
        "No link found for plan/duration:",
        data.planName,
        data.durationOption
      );
      return new Response("Nu am găsit link-ul pentru acest pachet/durată.", {
        status: 400,
      });
    }

    // Send Email to Admin
    const adminEmailResp = await sendEmail(
      env.ORDER_FORM_ADMIN_TEMPLATE_ID,
      {
        user_name: data.user_name,
        user_email: data.user_email,
        plan: data.planName,
        duration: data.durationOption,
        device_type: data.deviceType,
        preferred_player: data.preferredPlayer,
      },
      env
    );
    if (!adminEmailResp.ok) {
      const errText = await adminEmailResp.text();
      console.error("Eroare la email-ul către Admin:", errText);
      return new Response("Eroare la email-ul către Admin: " + errText, {
        status: 500,
      });
    }

    // Send Email to User
    const userEmailResp = await sendEmail(
      env.ORDER_FORM_USER_TEMPLATE_ID,
      {
        user_name: data.user_name,
        user_email: data.user_email,
        plan: data.planName,
        duration: data.durationOption,
        device_type: data.deviceType,
        preferred_player: data.preferredPlayer,
      },
      env
    );
    if (!userEmailResp.ok) {
      const errText = await userEmailResp.text();
      console.error("Eroare la email-ul către User:", errText);
      return new Response("Eroare la email-ul către User: " + errText, {
        status: 500,
      });
    }

    // Return JSON with Stripe link
    return new Response(
      JSON.stringify({ success: true, redirectUrl: stripeLink }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("handlePackageForm ERROR:", err);
    return new Response("Server error packageForm: " + err.message, {
      status: 500,
    });
  }
}

// EmailJS Function
async function sendEmail(template_id, template_params, env) {
  return fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: env.EMAILJS_SERVICE_ID,
      template_id: template_id,
      user_id: env.EMAILJS_PUBLIC_KEY,
      accessToken: env.EMAILJS_PRIVATE_KEY,
      template_params: template_params,
    }),
  });
}

// EXACT STRIPE LINKS (copied from your last Worker + your HTML)
const STRIPE_LINKS = {
  "Abonament Simplu - 1 DISPOZITIV": {
    "1 lună – £10": "https://buy.stripe.com/dR69E80e43uBdFeaEF",
    "3 luni – £30": "https://buy.stripe.com/8wM2bGgd23uBdFebIK",
    "6 luni – £60": "https://buy.stripe.com/cN26rWf8Y6GNcBa003",
    "12 luni – £120": "https://buy.stripe.com/9AQ17C3qg2qxdFe3cg",
  },
  "Abonament Simplu - 2 DISPOZITIVE": {
    "1 lună – £12": "https://buy.stripe.com/28o17C2mcd5bdFebIN",
    "3 luni – £36": "https://buy.stripe.com/7sI9E80e44yF1WwcMS",
    "6 luni – £72": "https://buy.stripe.com/dR6g2wd0Q6GN6cM3cj",
    "12 luni – £144": "https://buy.stripe.com/aEUbMg8KAfdjbx63ck",
  },
  "FULL PACHET 2 DISPOZITIVE": {
    "1 lună – £18": "https://buy.stripe.com/9AQ3fKbWMc1758I5kt",
    "Pachet 1 – 3 luni: £45": "https://buy.stripe.com/6oE03y5yo7KR58I28i",
    "Pachet 2 – 4 luni + 1 lună gratuită: £60":
      "https://buy.stripe.com/9AQg2w5yo9SZ7gQ9AL",
    "Pachet 3 – 5 luni + 1 lună gratuită: £75":
      "https://buy.stripe.com/5kA17C9OEc177gQaEQ",
    "Pachet 4 – 7 luni + 2 luni gratuite: £100":
      "https://buy.stripe.com/28o5nS3qgd5bcBa00e",
    "Pachet 5 – 9 luni + 3 luni gratuite: £130":
      "https://buy.stripe.com/cN2bMg2mc1mtbx67sF",
    "Pachet 6 – 8 luni + 4 luni gratuite: £160":
      "https://buy.stripe.com/4gw3fKgd2fdjbx6bIX",
  },
  "FULL PACHET 3 DISPOZITIVE": {
    "1 lună – £19": "https://buy.stripe.com/14k03y6Cs2qx30A8wM",
    "Pachet 1 – 3 luni: £50": "https://buy.stripe.com/4gw9E8e4U8OVdFecN3",
    "Pachet 2 – 4 luni + 1 lună gratuită: £63":
      "https://buy.stripe.com/eVa03y7Gw0ipfNm3cu",
    "Pachet 3 – 5 luni + 1 lună gratuită: £85":
      "https://buy.stripe.com/9AQ17C3qgghn6cMdRa",
    "Pachet 4 – 7 luni + 2 luni gratuite: £119":
      "https://buy.stripe.com/cN2dUo8KA8OVgRq4gz",
    "Pachet 5 – 9 luni + 3 luni gratuite: £153":
      "https://buy.stripe.com/14k03y7Gw2qx6cMfZj",
    "Pachet 6 – 8 luni + 4 luni gratuite: £172":
      "https://buy.stripe.com/9AQ7w0bWMghn7gQeVg",
  },
};

function findStripeLink(planName, durationOption) {
  const planLinks = STRIPE_LINKS[planName];
  if (!planLinks) {
    console.error("Plan not found:", planName);
    return null;
  }
  const link = planLinks[durationOption];
  if (!link) {
    console.error("Duration not found:", durationOption);
  }
  return link || null;
}
