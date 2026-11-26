/* Maharashtra Times Swasthya Sangam 2027 — shared by both
   /timeslanguages/mt-health (Summit, register form) and
   /timeslanguages/mt-health/award (Awards, nominate form).

   No payment/product and no GRX/Meta instrumentation for this event (free
   registration + nomination only) — see docs/new-event-integration.md,
   sections 2/4/5/6/7 are intentionally not implemented here. The only
   integrations in scope are: ?env=stg staging support, mobile-OTP login,
   and the two real EventHub forms via public/assets/tfm/eventFormRenderer.js. */
(function () {
  "use strict";

  /* ── Environment ──────────────────────────────────────────
     window.isProdEnv/window.constants are set inline in <head>, before
     this script, by both templates (per docs/new-event-integration.md §1). */
  var IS_PROD_ENV = String(window.isProdEnv) === "true";
  var ENV = (window.constants && window.constants.envDetails &&
    window.constants.envDetails[IS_PROD_ENV ? "production" : "testing"]) || {};
  var EVENTHUB_FORM_FETCH_BASE = ENV.eventHubBaseURL ? ENV.eventHubBaseURL + "/forms/code" : undefined;
  var EVENTHUB_FORM_SUBMIT_URL = ENV.eventHubBaseURL ? ENV.eventHubBaseURL + "/form-submissions" : undefined;

  /* ── Mobile menu (native <details class="menu">, close on link tap) ── */
  var menu = document.querySelector("details.menu");
  if (menu) {
    menu.addEventListener("click", function (event) {
      if (event.target.closest("a")) menu.removeAttribute("open");
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") menu.removeAttribute("open");
    });
  }

  /* ── LoginSupporter (mobile-OTP custom login) ─────────────
     Adapted from public/assets/tfm/tfmBengaluru.js — the TFM renderer
     needs window.loginSupporter's initiateCustomLogin/verifyCustomLogin/
     resendCustomOtp, not the legacy window.jssoRef-direct calls. */
  function initializeOtpSdk() {
    if (window.jssoRef && typeof window.jssoRef.checkUserExists === "function") return;
    if (typeof window.LoginSupporter !== "function" || window.loginSupporter) return;
    try {
      window.loginSupporter = new window.LoginSupporter({
        config: {
          channel: (window.constants && (window.constants.ssoChannel || window.constants.login_channel || window.constants.channel)) || "nbt",
          platform: window.platform === "mobile" ? "mweb" : "web",
          useProdScript: IS_PROD_ENV,
          loginOptions: ["mobile"],
        },
      });
      window.loginSupporter.initialize(function () {
        if (window.loginSupporter && typeof window.loginSupporter.returnJSsoObject === "function") {
          window.jssoRef = window.loginSupporter.returnJSsoObject();
        }
      });
    } catch (error) {
      window.loginSupporter = null;
      console.warn("[mt-health] Unable to initialize OTP service.", error);
    }
  }
  initializeOtpSdk();

  /* ── Enquiry dialog (Summit page hero "Enquire Now") ───────
     The form inside is a regular [data-event-form], mounted below. */
  var enquireDlg = document.getElementById("enquire-dialog");
  if (enquireDlg) {
    var openEnquiry = function () {
      if (typeof enquireDlg.showModal === "function") enquireDlg.showModal();
      else enquireDlg.setAttribute("open", "");
      document.documentElement.classList.add("modal-open");
    };
    var closeEnquiry = function () {
      if (typeof enquireDlg.close === "function") enquireDlg.close();
      else enquireDlg.removeAttribute("open");
      document.documentElement.classList.remove("modal-open");
    };
    document.addEventListener("click", function (event) {
      var trigger = event.target.closest("[data-open-enquiry]");
      if (!trigger) return;
      event.preventDefault();
      var menu = document.querySelector("details.menu");
      if (menu) menu.removeAttribute("open");
      openEnquiry();
    });
    enquireDlg.addEventListener("close", function () {
      document.documentElement.classList.remove("modal-open");
    });
    enquireDlg.addEventListener("click", function (event) {
      if (event.target.closest("[data-close]")) return closeEnquiry();
      var rect = enquireDlg.getBoundingClientRect();
      if (event.target === enquireDlg && (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom)) closeEnquiry();
    });
    if (window.location.hash === "#enquire") openEnquiry();
  }

  /* ── Label clicks stay inside their own form ───────────────
     EventFormRenderer ids are "efr-<field_id>", so two forms on one page
     (inline register + nomination popup, or enquiry + nomination popup)
     share ids and a label's for= would hit the other form's control. */
  document.addEventListener("click", function (event) {
    var label = event.target.closest && event.target.closest(".efr-fields label[for]");
    if (!label) return;
    var wrapper = label.closest("[data-field-wrapper]");
    var control = wrapper && wrapper.querySelector("#" + CSS.escape(label.htmlFor));
    if (!control || document.getElementById(label.htmlFor) === control) return;
    event.preventDefault();
    if (control.type === "checkbox") control.click();
    else control.focus();
  });

  /* ── EventFormRenderer mount/submit for every [data-event-form] ──────
     Each form's fields are built entirely from its live EventHub config
     (public/assets/tfm/eventFormRenderer.js) — nothing here hardcodes a
     field list. requireLogin:true forces the phone field's OTP UI even
     though both forms currently publish require_login:false themselves. */
  function setFormError(form, message) {
    var error = form.querySelector("[data-form-error]");
    if (error) {
      error.textContent = message || "";
      error.hidden = !message;
    }
  }

  function showFormSuccess(form) {
    var success = form.querySelector("[data-form-success]");
    if (success) success.hidden = false;
  }

  var formHandles = new WeakMap();

  function mountEventForm(form) {
    var fields = form.querySelector("[data-form-fields]");
    var formCode = form.getAttribute("data-form-code");
    if (!fields || !formCode) return Promise.resolve(null);

    fields.textContent = "Loading form...";
    setFormError(form, "");
    return window.EventFormRenderer.mount(fields, formCode, {
      fetchBaseUrl: EVENTHUB_FORM_FETCH_BASE,
      submitBaseUrl: EVENTHUB_FORM_SUBMIT_URL,
      requireLogin: true,
    }).then(function (handle) {
      formHandles.set(form, handle);
      return handle;
    }).catch(function (error) {
      fields.textContent = "";
      setFormError(form, (error && error.message) || "Unable to load this form. Please try again.");
      return null;
    });
  }

  document.querySelectorAll("[data-event-form]").forEach(function (form) {
    mountEventForm(form);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var handle = formHandles.get(form);
      var submitBtn = form.querySelector('button[type="submit"]');
      if (!handle) {
        setFormError(form, "Form is still loading. Please wait and try again.");
        return;
      }
      setFormError(form, "");
      var originalText = submitBtn ? submitBtn.textContent : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";
      }

      var validation = handle.collect();
      if (validation.firstError) {
        if (validation.firstError.control) validation.firstError.control.focus();
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
        return;
      }

      handle.submit().then(function () {
        var fields = form.querySelector("[data-form-fields]");
        if (fields) fields.hidden = true;
        if (submitBtn) submitBtn.hidden = true;
        showFormSuccess(form);
      }).catch(function (error) {
        setFormError(form, (error && error.message) || "Unable to submit this form. Please try again.");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      });
    });
  });
})();
