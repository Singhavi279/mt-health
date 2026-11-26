/* Maharashtra Times Swasthya Sangam 2027 — Awards page nomination + payment
   (/timeslanguages/mt-health/award).

   Flow (docs/new-event-integration.md §5/§6, modelled on
   public/assets/timeslang/niveshbaithak/script.js):
     1. Plan cards load their prices from get-product-details (never
        hardcoded); the product codes come from
        constants.envDetails.<env>.paymentConfig.mt_health.products.
     2. The dialog's fields are the live EventHub form
        "maharashtra-s-health-award" (EventFormRenderer, mobile OTP). The plan
        picker is added here and sent with the submission as extra answers.
     3. Pay Later  → submission saved as draft, stage "pay_later".
        Pay Now    → submission saved as draft, stage "details", then the
                     payment summary; Pay re-checks the price, requests a
                     signed payload and POSTs it to the gateway.
     4. On return from the gateway a status dialog shows success, failure or
        pending; failure/pending offer "Try again" with the form prefilled.

   No GRX funnel or Meta pixel for this event (same as the Summit page). */
(function () {
  "use strict";

  var dlg = document.getElementById("nominate-dialog");
  var conf = document.getElementById("confirm-dialog");
  var statusDlg = document.getElementById("payment-status-dialog");
  // The payment-status dialog only exists on the Awards page.
  if (!dlg || !conf) return;

  /* ── Environment ─────────────────────────────────────────── */
  var IS_PROD_ENV = String(window.isProdEnv) === "true";
  var ENV = (window.constants && window.constants.envDetails &&
    window.constants.envDetails[IS_PROD_ENV ? "production" : "testing"]) || {};
  var PAYMENT = (ENV.paymentConfig && ENV.paymentConfig.mt_health) || {};
  var LANGAPI_BASE = PAYMENT.langapiBaseURL || ENV.langapiBaseURL || "";
  var GATEWAY_BASE = PAYMENT.apiBaseURL || ENV.apiBaseURL || "";
  var MERCHANT_CODE = PAYMENT.merchantKey || PAYMENT.mcode || ENV.merchantKey || "";
  var FORM_CODE = "maharashtra-s-health-award";
  var CHECKOUT_KEY = "mt_health_pending_checkout";
  var PAYMENT_RETURN_PARAMS = ["status", "paymentStatus", "payment_status", "paymentReferenceID",
    "paymentReferenceId", "payment_reference_id", "pcode", "productCode", "ccode", "amount"];

  /* ── Helpers ─────────────────────────────────────────────── */
  function inr(n) { return "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN"); }
  function fill(root, key, text) {
    var node = root.querySelector('[data-fill="' + key + '"]');
    if (node) node.textContent = text;
  }
  function readCheckout() {
    try { return JSON.parse(sessionStorage.getItem(CHECKOUT_KEY) || "null"); } catch (error) { return null; }
  }
  function writeCheckout(value) {
    try {
      if (value) sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(value));
      else sessionStorage.removeItem(CHECKOUT_KEY);
    } catch (error) {}
  }
  function submissionIdOf(response) {
    return (response && response.data && response.data.submission_id) ||
      (response && (response.submission_id || response.id || response._id)) || "";
  }
  function phoneDigits(value) { return String(value || "").replace(/\D/g, "").slice(-10); }

  /* ── Plans: prices from the product API ──────────────────── */
  // The API answers errors with HTTP 200 (E007), so the body is validated.
  function fetchProduct(code) {
    if (!code || !LANGAPI_BASE) return Promise.reject(new Error("Payment is not configured."));
    var url = LANGAPI_BASE + "/payment/get-product-details?pcode=" + encodeURIComponent(code) +
      "&mcode=" + encodeURIComponent(MERCHANT_CODE);
    return fetch(url, { headers: { Accept: "application/json" } }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    }).then(function (data) {
      var details = data && (data.data || data);
      var total = Number(details && (details._sale_price != null ? details._sale_price : details.final_billing_amount));
      if (!details || details.product_code !== code || details.currency !== "INR" || !(total > 0)) {
        throw new Error("Price unavailable.");
      }
      var base = Number(details._sale_price_without_gst) || Number(details.product_amount_without_gst) || 0;
      return {
        code: code,
        productName: details.product_name || "",
        base: base,
        list: Number(details.product_amount_without_gst) || base,
        gst: Number(details._gst_amount) || Math.max(0, total - base),
        total: total,
        couponCode: String(details._coupon_code || "").trim(),
      };
    });
  }

  var planSelect = document.getElementById("nom-plan");
  var plans = {};
  document.querySelectorAll(".plan[data-plan]").forEach(function (card) {
    var id = card.getAttribute("data-plan");
    var option = document.createElement("option");
    option.value = id;
    plans[id] = {
      id: id,
      code: card.getAttribute("data-pcode"),
      name: card.querySelector(".plan-name").textContent.trim(),
      card: card,
      option: option,
      product: null,
    };
    option.textContent = plans[id].name;
    if (planSelect) planSelect.appendChild(option);
  });

  function renderPlan(plan) {
    var box = plan.card.querySelector("[data-price-box]");
    var offer = plan.card.querySelector(".plan-offer");
    var product = plan.product;
    box.textContent = "";
    plan.option.textContent = product ? plan.name + " (" + inr(product.base) + " + GST)" : plan.name;
    if (!product) {
      if (offer) offer.hidden = true;
      var na = document.createElement("span");
      na.className = "plan-loading";
      na.textContent = "Price unavailable right now. Please refresh the page.";
      box.appendChild(na);
      return;
    }
    // Strike through the rate card only when the sale price is lower.
    var discounted = product.list > product.base;
    if (offer) offer.hidden = !discounted;
    if (discounted) {
      var del = document.createElement("del");
      var sr = document.createElement("span");
      sr.className = "sr-only";
      sr.textContent = "Original price ";
      del.appendChild(sr);
      del.appendChild(document.createTextNode(inr(product.list)));
      box.appendChild(del);
      box.appendChild(document.createTextNode(" "));
    }
    var strong = document.createElement("strong");
    strong.appendChild(document.createTextNode(inr(product.base)));
    strong.appendChild(document.createElement("small")).textContent = " + GST";
    box.appendChild(strong);
  }

  function loadPlan(plan) {
    return fetchProduct(plan.code).then(function (product) {
      plan.product = product;
    }).catch(function () {
      plan.product = null;
    }).then(function () { renderPlan(plan); });
  }
  Object.keys(plans).forEach(function (id) { loadPlan(plans[id]); });

  /* ── Dialog open/close ───────────────────────────────────── */
  var form = dlg.querySelector("form");
  var fieldsEl = form.querySelector("[data-form-fields]");
  var viewForm = dlg.querySelector("[data-view=form]");
  var viewPay = dlg.querySelector("[data-view=pay]");
  var formNote = viewForm.querySelector(".nom-note");
  var payNote = viewPay.querySelector("[data-pay-note]");
  var payBtn = viewPay.querySelector("[data-pay]");
  var pending = null;

  function lock(on) { document.documentElement.classList.toggle("modal-open", on); }
  function anyOpen() { return dlg.open || conf.open || !!(statusDlg && statusDlg.open); }
  function show(d) {
    if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
    lock(true);
  }
  function hide(d) {
    if (typeof d.close === "function") d.close(); else d.removeAttribute("open");
    if (!anyOpen()) lock(false);
  }
  function setView(name) {
    viewForm.hidden = name !== "form";
    viewPay.hidden = name !== "pay";
    dlg.scrollTop = 0;
  }
  function openNomination(planId) {
    setView("form");
    formNote.textContent = "";
    payNote.textContent = "";
    if (planId && plans[planId] && planSelect) planSelect.value = planId;
    show(dlg);
  }

  document.addEventListener("click", function (event) {
    var trigger = event.target.closest('a[href="#nominate"], [data-open-nominate]');
    if (!trigger) return;
    event.preventDefault();
    var menu = document.querySelector("details.menu");
    if (menu) menu.removeAttribute("open");
    openNomination(trigger.getAttribute("data-plan"));
  });

  [dlg, conf, statusDlg].filter(Boolean).forEach(function (d) {
    d.addEventListener("close", function () { if (!anyOpen()) lock(false); });
    d.addEventListener("click", function (event) {
      if (event.target.closest("[data-close]")) return hide(d);
      var rect = d.getBoundingClientRect();
      if (event.target === d && (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom)) hide(d);
    });
  });

  /* ── Form (live EventHub config) ─────────────────────────── */
  var formHandle = null;
  fieldsEl.textContent = "Loading form...";
  var formReady = window.EventFormRenderer
    ? window.EventFormRenderer.mount(fieldsEl, FORM_CODE, {
      fetchBaseUrl: ENV.eventHubBaseURL ? ENV.eventHubBaseURL + "/forms/code" : undefined,
      submitBaseUrl: ENV.eventHubBaseURL ? ENV.eventHubBaseURL + "/form-submissions" : undefined,
      requireLogin: true,
    }).then(function (handle) {
      formHandle = handle;
      return handle;
    }).catch(function (error) {
      fieldsEl.textContent = "";
      formNote.textContent = (error && error.message) || "Unable to load the nomination form. Please try again.";
      return null;
    })
    : Promise.resolve(null);

  // The renderer only refreshes field errors on collect(); clear a field's
  // error as soon as it is edited so stale "required" messages don't linger.
  function clearFieldError(event) {
    var target = event.target;
    var id = (target.id || "").replace(/^efr-/, "") || target.name;
    var error = id && fieldsEl.querySelector("#efr-error-" + id);
    if (error && !error.hidden) {
      error.textContent = "";
      error.hidden = true;
    }
    if (formNote.textContent) formNote.textContent = "";
  }
  fieldsEl.addEventListener("input", clearFieldError);
  fieldsEl.addEventListener("change", clearFieldError);

  // Restore answers after a failed/pending payment so "Try again" opens
  // prefilled. The phone field is left to the renderer's own OTP state.
  function prefill(answers) {
    if (!answers) return;
    Object.keys(answers).forEach(function (key) {
      var value = answers[key];
      if (Array.isArray(value)) {
        value.forEach(function (item) {
          var box = fieldsEl.querySelector('input[type="checkbox"][name="' + key + '"][value="' + item + '"]');
          if (box && !box.checked) { box.checked = true; box.dispatchEvent(new Event("change", { bubbles: true })); }
        });
        return;
      }
      var control = fieldsEl.querySelector("#efr-" + key);
      if (!control || control.type === "tel") return;
      if (control.type === "checkbox") control.checked = value === true || value === "true";
      else if (!control.value) control.value = value;
      control.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  function setBusy(busy, button, label) {
    if (busy) dlg.setAttribute("data-busy", ""); else dlg.removeAttribute("data-busy");
    form.querySelectorAll(".nom-actions button").forEach(function (b) { b.disabled = busy; });
    if (button && label) button.textContent = label;
  }

  function showConfirm(answers) {
    var name = String(answers.full_name || "").trim();
    fill(conf, "first", name.split(/\s+/)[0] || "there");
    fill(conf, "nominee", answers.nominee_organisation_name || "");
    fill(conf, "reach", "+91 " + phoneDigits(answers.phone_number) + " · " + (answers.email || ""));
    hide(dlg);
    show(conf);
    conf.querySelector(".conf-done").focus();
  }

  function fillPaySummary(plan) {
    var product = plan.product;
    fill(viewPay, "plan", plan.name);
    fill(viewPay, "subtotal", inr(product.base));
    fill(viewPay, "gstlabel", product.base ? "GST (" + Math.round(product.gst / product.base * 100) + "%)" : "GST");
    fill(viewPay, "gst", inr(product.gst));
    fill(viewPay, "total", inr(product.total));
    payBtn.textContent = "Pay " + inr(product.total);
  }

  // Enquiry only: one "Register" button, no plan picker and no payment.
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var button = form.querySelector(".nom-actions button[type=submit]");
    formNote.textContent = "";

    if (!formHandle) {
      formNote.textContent = "The form is still loading. Please wait and try again.";
      return;
    }
    var validation = formHandle.collect();
    if (validation.firstError) {
      formNote.textContent = validation.firstError.message || "Please check the highlighted fields.";
      if (validation.firstError.control) validation.firstError.control.focus();
      return;
    }

    var answers = validation.answers;
    var label = button ? button.textContent : "";
    setBusy(true, button, "Saving...");
    formHandle.submit().then(function () {
      writeCheckout(null);
      showConfirm(answers);
    }).catch(function (error) {
      formNote.textContent = (error && error.message) || "Unable to save your nomination. Please try again.";
    }).then(function () {
      setBusy(false, button, label);
    });
  });

  viewPay.querySelector("[data-back]").addEventListener("click", function () { setView("form"); });

  /* ── Payment ─────────────────────────────────────────────── */
  function paymentReturnUrl(status, code) {
    var url = new URL(window.location.href);
    PAYMENT_RETURN_PARAMS.forEach(function (key) { url.searchParams.delete(key); });
    url.hash = "";
    url.searchParams.set("status", status);
    url.searchParams.set("pcode", code);
    return url.toString();
  }

  function trackingParams() {
    var params = new URLSearchParams(window.location.search);
    return {
      acq_source: params.get("acqsource") || params.get("acq_source") || params.get("utm_source") || "",
      acq_sub_source: params.get("acqsubsource") || params.get("acq_sub_source") || params.get("utm_medium") || "",
    };
  }

  function submitToGateway(signed) {
    var gatewayForm = document.createElement("form");
    gatewayForm.method = "POST";
    gatewayForm.action = GATEWAY_BASE + "/pay";
    gatewayForm.style.display = "none";
    Object.keys(signed).forEach(function (key) {
      var input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = typeof signed[key] === "object" ? JSON.stringify(signed[key]) : String(signed[key]);
      gatewayForm.appendChild(input);
    });
    document.body.appendChild(gatewayForm);
    gatewayForm.submit();
  }

  function startPayment() {
    var plan = plans[pending.planId];
    var answers = pending.answers;
    var shownTotal = plan.product.total;
    if (!LANGAPI_BASE || !GATEWAY_BASE || !MERCHANT_CODE) {
      return Promise.reject(new Error("Payment service is not configured. Please choose Pay Later."));
    }
    // Re-check the price right before paying; stop if it changed.
    return fetchProduct(plan.code).then(function (product) {
      plan.product = product;
      renderPlan(plan);
      if (product.total !== shownTotal) {
        fillPaySummary(plan);
        throw new Error("The price for this plan has changed. Please review the new total and tap Pay again.");
      }
      var phone = phoneDigits(answers.phone_number);
      var payload = {
        first_name: answers.full_name || "Customer",
        pcode: product.code,
        mcode: MERCHANT_CODE,
        surl: paymentReturnUrl("success", product.code),
        furl: paymentReturnUrl("failure", product.code),
        purl: paymentReturnUrl("pending", product.code),
        email: answers.email || "",
        phone: phone,
        product_code: product.code,
        si: 0,
        quantity: 1,
        udf: trackingParams(),
        type: "standard",
        submission_id: pending.submissionId || "",
        hostname: "sptree",
        miscellaneous: {},
      };
      if (product.couponCode) payload.ccode = product.couponCode;

      // The redirect wipes in-memory state; keep what the return needs.
      writeCheckout({
        planId: plan.id,
        planName: plan.name,
        productCode: product.code,
        amount: product.total,
        submissionId: pending.submissionId || "",
        answers: answers,
      });

      return fetch(LANGAPI_BASE + "/payment/generate-payment-payload", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
    }).then(function (response) {
      if (!response.ok) throw new Error("Unable to start payment. Please try again.");
      return response.json();
    }).then(function (signed) {
      if (!signed || typeof signed !== "object") throw new Error("Payment service returned an invalid response.");
      submitToGateway(signed);
    });
  }

  payBtn.addEventListener("click", function () {
    if (!pending) return;
    var label = payBtn.textContent;
    payBtn.disabled = true;
    payBtn.textContent = "Processing...";
    payNote.textContent = "";
    startPayment().catch(function (error) {
      payNote.textContent = (error && error.message) || "We could not start the payment. Please try again or choose Pay Later.";
      payBtn.disabled = false;
      if (payBtn.textContent === "Processing...") payBtn.textContent = label;
    });
  });

  /* ── Return from the gateway ─────────────────────────────── */
  function normalizePaymentStatus(raw) {
    var s = String(raw || "").toLowerCase();
    if (["paid", "success", "successful"].indexOf(s) > -1) return "success";
    if (["pending", "processing"].indexOf(s) > -1) return "pending";
    if (["failed", "failure", "cancelled", "canceled"].indexOf(s) > -1) return "failure";
    return "";
  }

  function handlePaymentReturn() {
    if (!statusDlg) return;
    var params = new URLSearchParams(window.location.search);
    // The gateway's own paymentStatus wins over the status we put on the URL.
    var status = normalizePaymentStatus(params.get("paymentStatus") || params.get("payment_status") || params.get("status"));
    if (!status) return;
    var reference = params.get("paymentReferenceID") || params.get("paymentReferenceId") || params.get("payment_reference_id") || "";
    var code = params.get("productCode") || params.get("pcode") || "";

    try {
      var url = new URL(window.location.href);
      PAYMENT_RETURN_PARAMS.forEach(function (key) { url.searchParams.delete(key); });
      window.history.replaceState({}, document.title, url.toString());
    } catch (error) {}

    var checkout = readCheckout() || {};
    var planName = checkout.planName ||
      (Object.keys(plans).map(function (id) { return plans[id]; }).filter(function (p) { return p.code === code; })[0] || {}).name ||
      "your nomination plan";
    var tick = statusDlg.querySelector(".conf-tick");
    var retry = statusDlg.querySelector("[data-retry]");
    tick.className = "conf-tick" + (status === "success" ? "" : " is-" + status);
    retry.hidden = status === "success";

    if (status === "success") {
      fill(statusDlg, "title", "Payment successful");
      fill(statusDlg, "copy", "Your nomination fee for " + planName + " is paid" +
        (checkout.amount ? " (" + inr(checkout.amount) + ")" : "") +
        (reference ? ". Reference: " + reference : "") +
        ". Our awards team will reach out with the next steps.");
      writeCheckout(null);
    } else if (status === "failure") {
      fill(statusDlg, "title", "Payment failed");
      fill(statusDlg, "copy", "Your payment for " + planName + " could not be completed. Please try again.");
    } else {
      fill(statusDlg, "title", "Payment pending");
      fill(statusDlg, "copy", "Your payment for " + planName + " is being processed. We will notify you once it is confirmed.");
    }
    show(statusDlg);
    (retry.hidden ? statusDlg.querySelector(".conf-done") : retry).focus();

    // "Try again" returns to the details step: the reload wiped the
    // submission, so the form must be submitted again before paying.
    retry.onclick = function () {
      hide(statusDlg);
      openNomination(checkout.planId);
      formReady.then(function () { prefill(checkout.answers); });
    };
  }

  handlePaymentReturn();
  if (window.location.hash === "#nominate" && !(statusDlg && statusDlg.open)) openNomination();
})();
