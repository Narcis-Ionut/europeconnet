document.addEventListener("DOMContentLoaded", function () {
  /**
   * 1) FAQ Toggle (for both pages and any instruction sections)
   */
  const faqItems = document.querySelectorAll(".faq-item h3");
  faqItems.forEach((item) => {
    item.addEventListener("click", function () {
      const answer = this.nextElementSibling;
      if (!answer) return;
      answer.style.display =
        answer.style.display === "block" ? "none" : "block";
    });
  });

  /**
   * 2) CONTACT FORM (#contactForm)
   *    – posts data to the Worker (/api/contactForm),
   *      which then sends the email (via EmailJS) and responds with { success: true }
   */
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      // Gather form data
      const userName = document.getElementById("name")?.value.trim() || "";
      const userEmail = document.getElementById("email")?.value.trim() || "";
      const userPhone = document.getElementById("phone")?.value.trim() || "";
      const userCountry =
        document.getElementById("country")?.value.trim() || "";
      const userMessage =
        document.getElementById("message")?.value.trim() || "";
      const deviceType = document.getElementById("deviceType")?.value || "";
      const preferredPlayer =
        document.getElementById("preferredPlayer")?.value || "";

      // Build POST payload
      const payload = {
        user_name: userName,
        user_email: userEmail,
        user_phone: userPhone,
        user_country: userCountry,
        message: userMessage,
        deviceType,
        preferredPlayer,
      };

      try {
        // Send data to Worker
        const response = await fetch("/api/contactForm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("contactForm error:", errText);
          alert("Error submitting the form. Please try again.");
          return;
        }

        // Success
        const jsonResp = await response.json();
        if (jsonResp && jsonResp.success) {
          alert("Message sent! Thank you.");
          contactForm.reset();
        } else {
          alert("Something went wrong. Please try again.");
        }
      } catch (error) {
        console.error("contactForm fetch error:", error);
        alert("Connection error. Please try again.");
      }
    });
  }

  /**
   * 3) MODAL – PLAN SELECTION (on packages.html)
   */
  const modal = document.getElementById("packageModal");
  const closeModal = modal ? modal.querySelector(".close") : null;

  const selectButtons = document.querySelectorAll(".select-package-btn");
  selectButtons.forEach((button) => {
    button.addEventListener("click", function () {
      if (!modal) return;
      const packageCard = this.closest(".package-card");
      if (!packageCard) return;

      // Get planName + durations (JSON)
      const planName = packageCard.getAttribute("data-plan") || "Unknown plan";
      const durationsData = packageCard.getAttribute("data-durations") || "[]";

      // Set modal title
      const modalPackageTitle = document.getElementById("modalPackageTitle");
      if (modalPackageTitle) {
        modalPackageTitle.textContent = planName;
      }

      // Populate duration dropdown
      const modalDurationSelect = document.getElementById(
        "modalDurationSelect"
      );
      if (modalDurationSelect) {
        modalDurationSelect.innerHTML = "";
        let durations = [];
        try {
          durations = JSON.parse(durationsData);
        } catch (e) {
          console.error("Error parsing durations data", e);
        }
        durations.forEach((item, index) => {
          const optionElem = document.createElement("option");
          optionElem.value = index;
          optionElem.textContent = item.option;
          modalDurationSelect.appendChild(optionElem);
        });
        // Store full JSON on the select for later use
        modalDurationSelect.setAttribute("data-durations", durationsData);
      }

      // Open modal
      modal.style.display = "block";
    });
  });

  // X button → close modal
  if (closeModal) {
    closeModal.addEventListener("click", function () {
      modal.style.display = "none";
    });
  }
  // Click on backdrop → close modal
  window.addEventListener("click", function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });

  /**
   * 4) MODAL FORM (#packageForm)
   *    – posts data to the Worker (/api/packageForm),
   *      which sends two emails (Admin + User) and returns { success, redirectUrl }
   */
  const packageForm = document.getElementById("packageForm");
  if (packageForm) {
    packageForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const userNameElem = document.getElementById("userNameModal");
      const userEmailElem = document.getElementById("userEmailModal");
      const planNameElem = document.getElementById("modalPackageTitle");
      const modalDurationSelect = document.getElementById(
        "modalDurationSelect"
      );
      const deviceType =
        document.getElementById("modalDeviceType")?.value || "";
      const preferredPlayer =
        document.getElementById("modalPreferredPlayer")?.value || "";

      const userName = userNameElem?.value.trim() || "";
      const userEmail = userEmailElem?.value.trim() || "";
      const planName = planNameElem?.textContent.trim() || "";
      const selectedIndex = modalDurationSelect?.value || "";
      const durationsData =
        modalDurationSelect?.getAttribute("data-durations") || "[]";

      if (!userName || !userEmail || !planName || selectedIndex === "") {
        alert("Please fill out all fields and choose a duration!");
        return;
      }

      let durations = [];
      try {
        durations = JSON.parse(durationsData);
      } catch (e) {
        console.error("Error parsing durations data", e);
      }
      const selectedOption = durations[selectedIndex];
      if (!selectedOption) {
        alert("Invalid duration option.");
        return;
      }

      // Disable the button to prevent double‑clicks
      const submitButton = packageForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Processing...";
      }

      // Payload for Worker
      const payload = {
        user_name: userName,
        user_email: userEmail,
        planName: planName,
        durationOption: selectedOption.option, // e.g. "1 month –  €10"
        deviceType,
        preferredPlayer,
      };

      try {
        const response = await fetch("/api/packageForm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("packageForm error:", errText);
          alert("Error submitting the order. Please try again.");
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Confirm & Pay";
          }
          return;
        }

        const jsonResp = await response.json();
        if (jsonResp && jsonResp.success && jsonResp.redirectUrl) {
          // Success – close modal + redirect to Stripe
          modal.style.display = "none";
          window.location.href = jsonResp.redirectUrl;
        } else {
          alert("Something went wrong. Please try again.");
        }
      } catch (error) {
        console.error("packageForm fetch error:", error);
        alert("Connection error. Please try again.");
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Confirm & Pay";
        }
      }
    });
  }
});
