(function () {
  "use strict";

  var API_URL = "https://api.indiatimes.com/eventhub/api/portal/events";
  // Segment renamed for display and shown first (editorial request).
  var SEGMENT_RENAME = { "healthcare providers & medical excellence": "Clinical Excellence Awards" };
  var SEGMENT_ORDER = [
    "Clinical Excellence Awards",
    "Pharma, Diagnostics & Life Sciences",
    "MedTech, HealthTech & Digital Innovation",
    "Prevention, Wellness & Social Impact",
    "Healthcare Providers & Medical Excellence",
  ].map(function (name) { return name.toLowerCase(); });

  function pluralize(count, noun) {
    if (count === 1) return "1 " + noun;
    var plural = noun.slice(-8) === "category" ? noun.slice(0, -8) + "categories" : noun + "s";
    return count + " " + plural;
  }

  function segmentOrder(name) {
    var index = SEGMENT_ORDER.indexOf(String(name || "").trim().toLowerCase());
    return index === -1 ? SEGMENT_ORDER.length : index;
  }

  function buildTabs(segments) {
    var tabs = document.createElement("div");
    tabs.className = "award-cat-tabs";
    tabs.setAttribute("role", "tablist");

    segments.forEach(function (segment, index) {
      var tab = document.createElement("button");
      tab.type = "button";
      tab.className = "award-cat-tab" + (index === 0 ? " active" : "");
      tab.id = "award-cat-tab-" + index;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", "award-cat-panel-" + index);
      tab.setAttribute("aria-selected", index === 0 ? "true" : "false");
      tab.setAttribute("data-award-cat-tab", index);

      var title = document.createElement("span");
      title.className = "award-cat-tab-title";
      title.textContent = segment.name || "Untitled Segment";
      tab.appendChild(title);

      var count = document.createElement("span");
      count.className = "award-cat-tab-count";
      count.textContent = pluralize(segment.children.length, "category");
      tab.appendChild(count);
      tabs.appendChild(tab);
    });

    return tabs;
  }

  function buildAccordionItem(category, segmentIndex, itemIndex) {
    var item = document.createElement("div");
    item.className = "award-cat-acc-item";

    var header = document.createElement("button");
    header.type = "button";
    header.className = "award-cat-acc-header";
    header.setAttribute("aria-expanded", "false");
    header.id = "award-cat-header-" + segmentIndex + "-" + itemIndex;

    var headerText = document.createElement("span");
    headerText.textContent = category.name || "Untitled Category";
    header.appendChild(headerText);

    var chevron = document.createElement("span");
    chevron.className = "award-cat-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = "⌄";
    header.appendChild(chevron);

    var body = document.createElement("div");
    body.className = "award-cat-acc-body";
    body.setAttribute("role", "region");
    body.setAttribute("aria-labelledby", header.id);
    body.hidden = true;

    var bodyInner = document.createElement("div");
    bodyInner.className = "award-cat-acc-body-inner";
    if (category.description) {
      var description = document.createElement("p");
      description.className = "award-cat-description";
      description.textContent = category.description;
      bodyInner.appendChild(description);
    }

    var customFields = category.custom_fields || category.custom_field || {};
    if (customFields.who_can_apply) {
      var eligibility = document.createElement("p");
      eligibility.className = "award-cat-who-can-apply";
      var label = document.createElement("strong");
      label.textContent = "Who can apply: ";
      eligibility.appendChild(label);
      eligibility.appendChild(document.createTextNode(String(customFields.who_can_apply)));
      bodyInner.appendChild(eligibility);
    }

    body.appendChild(bodyInner);
    header.addEventListener("click", function () {
      var isOpen = header.getAttribute("aria-expanded") === "true";
      header.setAttribute("aria-expanded", String(!isOpen));
      body.hidden = isOpen;
      item.classList.toggle("open", !isOpen);
    });

    item.appendChild(header);
    item.appendChild(body);
    return item;
  }

  function switchTab(root, index) {
    root.querySelectorAll("[data-award-cat-tab]").forEach(function (tab) {
      var active = tab.getAttribute("data-award-cat-tab") === String(index);
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    root.querySelectorAll(".award-cat-panel").forEach(function (panel) {
      var active = panel.id === "award-cat-panel-" + index;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
  }

  function renderStatus(root, message, isError, retry) {
    root.setAttribute("aria-busy", "false");
    root.innerHTML = "";
    var status = document.createElement("div");
    status.className = "award-cat-status" + (isError ? " award-cat-status-error" : "");
    var text = document.createElement("p");
    text.textContent = message;
    status.appendChild(text);
    if (retry) {
      var retryButton = document.createElement("button");
      retryButton.type = "button";
      retryButton.className = "btn btn-ghost";
      retryButton.textContent = "Retry";
      retryButton.addEventListener("click", retry);
      status.appendChild(retryButton);
    }
    root.appendChild(status);
  }

  // Fallback when the API cannot be reached: no stale copy, just who to call.
  function renderComingSoon(root, summary) {
    root.setAttribute("aria-busy", "false");
    root.innerHTML = "";
    if (summary) summary.textContent = "";
    var status = document.createElement("div");
    status.className = "award-cat-status";
    var text = document.createElement("p");
    text.appendChild(document.createTextNode("Award categories coming soon. Want to know more? Contact Simran Singh: "));
    var tel = document.createElement("a");
    tel.href = "tel:+917838788554";
    tel.textContent = "+91 7838788554";
    text.appendChild(tel);
    status.appendChild(text);
    root.appendChild(status);
  }

  function render(root, segments, summary) {
    root.setAttribute("aria-busy", "false");
    root.innerHTML = "";
    var total = segments.reduce(function (count, segment) { return count + segment.children.length; }, 0);
    if (summary) summary.textContent = pluralize(total, "award category") + " across " + pluralize(segments.length, "segment") + ".";

    var layout = document.createElement("div");
    layout.className = "award-cat-layout";
    var tabs = buildTabs(segments);
    layout.appendChild(tabs);

    var content = document.createElement("div");
    content.className = "award-cat-content-area";
    segments.forEach(function (segment, segmentIndex) {
      var panel = document.createElement("div");
      panel.className = "award-cat-panel" + (segmentIndex === 0 ? " active" : "");
      panel.id = "award-cat-panel-" + segmentIndex;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", "award-cat-tab-" + segmentIndex);
      panel.hidden = segmentIndex !== 0;

      if (segment.description) {
        var segmentDescription = document.createElement("p");
        segmentDescription.className = "award-cat-segment-desc";
        segmentDescription.textContent = segment.description;
        panel.appendChild(segmentDescription);
      }

      var accordion = document.createElement("div");
      accordion.className = "award-cat-accordion";
      segment.children.forEach(function (category, itemIndex) {
        accordion.appendChild(buildAccordionItem(category, segmentIndex, itemIndex));
      });
      panel.appendChild(accordion);
      content.appendChild(panel);
    });
    layout.appendChild(content);

    tabs.querySelectorAll("[data-award-cat-tab]").forEach(function (tab) {
      tab.addEventListener("click", function () { switchTab(root, tab.getAttribute("data-award-cat-tab")); });
    });
    root.appendChild(layout);
  }

  // Shared by the Awards page tabs and the Summit page teaser: the event's
  // segments with at least one category, in SEGMENT_ORDER.
  function fetchSegments(eventKey) {
    return fetch(API_URL + "/" + encodeURIComponent(eventKey) + "/categories", {
      headers: { Accept: "application/json" },
      cache: "default",
    }).then(function (response) {
      if (!response.ok) throw new Error("Unable to load award categories. Please try again.");
      return response.json();
    }).then(function (payload) {
      var segments = payload && payload.data && Array.isArray(payload.data.segments) ? payload.data.segments : [];
      return segments.map(function (segment, index) {
        var key = String(segment.name || "").trim().toLowerCase();
        return {
          name: SEGMENT_RENAME[key] || segment.name,
          description: segment.description,
          index: index,
          children: Array.isArray(segment.children) ? segment.children : [],
        };
      }).filter(function (segment) { return segment.children.length > 0; })
        .sort(function (left, right) { return segmentOrder(left.name) - segmentOrder(right.name) || left.index - right.index; });
    });
  }

  function load(root, summary) {
    root.setAttribute("aria-busy", "true");
    fetchSegments(root.getAttribute("data-event-key")).then(function (segments) {
      if (!segments.length) {
        renderStatus(root, "Award categories will be published here shortly.", false);
        return;
      }
      render(root, segments, summary);
    }).catch(function (error) {
      renderComingSoon(root, summary);
    });
  }

  // Summit page teaser: one row per segment with its category count, plus a
  // total line. On failure or no data the list is hidden — the teaser's
  // CTAs still lead to the Awards page.
  var TEASER_COLORS = ["#6fa0e6", "#52b83a", "#f2c14e", "#b48be6"];

  function loadTeaser(list) {
    var count = document.querySelector("[data-award-teaser-count]");
    fetchSegments(list.getAttribute("data-event-key")).then(function (segments) {
      if (!segments.length) throw new Error("No award segments");
      var total = 0;
      list.textContent = "";
      segments.forEach(function (segment, index) {
        total += segment.children.length;
        var item = document.createElement("li");
        item.style.setProperty("--c", TEASER_COLORS[index % TEASER_COLORS.length]);
        item.appendChild(document.createElement("span")).textContent = segment.name || "Untitled Segment";
        item.appendChild(document.createElement("small")).textContent = pluralize(segment.children.length, "category");
        list.appendChild(item);
      });
      list.removeAttribute("aria-busy");
      if (count) {
        count.textContent = pluralize(total, "award category") + " across " + pluralize(segments.length, "segment");
        count.hidden = false;
      }
    }).catch(function () {
      list.hidden = true;
    });
  }

  document.querySelectorAll("[data-award-teaser]").forEach(loadTeaser);

  document.querySelectorAll("[data-award-categories]").forEach(function (root) {
    var summary = root.closest(".award-categories").querySelector("[data-award-cat-summary]");
    load(root, summary);
  });
}());
