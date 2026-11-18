$(document).ready(function () {
    console.log("jQuery is ready!");
    console.log("MCTiers League: Final Project Engine Initialized");

    // ======================================================================
    // 1. Cross-Page State & LocalStorage Persistence Helpers
    // ======================================================================
    function safeGetStorage(key) {
        try { return window.localStorage.getItem(key); } catch (e) { return null; }
    }
    function safeSetStorage(key, val) {
        try { window.localStorage.setItem(key, String(val)); } catch (e) {}
    }
    function safeRemoveStorage(key) {
        try { window.localStorage.removeItem(key); } catch (e) {}
    }

    function safeGetJSON(key, fallback) {
        const raw = safeGetStorage(key);
        if (!raw) return fallback;
        try {
            return JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    }

    function safeSetJSON(key, obj) {
        safeSetStorage(key, JSON.stringify(obj));
    }

    const DEMO_USER = {
        fullName: "Batyrkhan Uvayev",
        ign: "marble",
        email: "batyrkhan@mctiersleague.net",
        phone: "+7 (777) 123-45-67",
        discipline: "Sword",
        password: "Gladiator#2026",
        experience: "Discord: batyrkhan#2026 | Lead Organizer & HT1 Sword Champion",
        ticketId: "MCT-202601",
        registeredAt: "2026-11-14"
    };

    function getRegisteredUsers() {
        const list = safeGetJSON("mctiers_users", []);
        if (!Array.isArray(list) || list.length === 0) {
            safeSetJSON("mctiers_users", [DEMO_USER]);
            return [DEMO_USER];
        }
        return list;
    }

    function getCurrentUser() {
        return safeGetJSON("mctiers_current_user", null);
    }

    function setCurrentUser(userObj) {
        safeSetJSON("mctiers_current_user", userObj);
        updateAuthNavbarUI();
    }

    function saveOrUpdateUser(userObj) {
        const users = getRegisteredUsers();
        const existingIdx = users.findIndex(
            u => u.email.toLowerCase() === userObj.email.toLowerCase() || u.ign.toLowerCase() === userObj.ign.toLowerCase()
        );
        if (existingIdx >= 0) {
            users[existingIdx] = Object.assign({}, users[existingIdx], userObj);
        } else {
            users.push(userObj);
        }
        safeSetJSON("mctiers_users", users);
        setCurrentUser(userObj);
    }

    function updateAuthNavbarUI() {
        const currentUser = getCurrentUser();
        const $profileLink = $("#navProfileLink");
        const $loginLink = $("#navLoginLink");
        const $sidebarAuth = $("#sidebarAuthStatus");

        if (currentUser && currentUser.ign) {
            if ($profileLink.length) {
                $profileLink.html(`👤 Profile (${currentUser.ign})`);
            }
            if ($loginLink.length) {
                $loginLink.html(`🔑 Switch Account`);
            }
            if ($sidebarAuth.length) {
                $sidebarAuth.html(
                    `<span class="text-success fw-bold">● Logged in as ${currentUser.ign}</span> <a href="profile.html" class="d-inline ms-1 text-info">View Profile &rarr;</a>`
                );
            }
        } else {
            if ($profileLink.length) {
                $profileLink.html("Profile");
            }
            if ($loginLink.length) {
                $loginLink.html("Log In");
            }
            if ($sidebarAuth.length) {
                $sidebarAuth.html(
                    `<span class="text-muted">Not signed in.</span> <a href="login.html" class="d-inline ms-1 text-info">Log In &rarr;</a>`
                );
            }
        }
    }

    getRegisteredUsers();
    updateAuthNavbarUI();

    // ======================================================================
    // 2. Requirement 5.2: Shared Custom Form Validation Rules (No HTML attrs)
    // ======================================================================
    const ValidationRules = {
        isRequired(val) {
            return Boolean(val && String(val).trim().length > 0);
        },
        isValidEmail(val) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
            return emailRegex.test(String(val || "").trim());
        },
        isValidPhone(val) {
            const raw = String(val || "").trim();
            // Allows +, digits, spaces, dashes, parentheses; must contain 10 to 15 digits
            const patternOk = /^\+?[0-9\s\-()]{10,18}$/.test(raw);
            const digitCount = (raw.match(/\d/g) || []).length;
            return patternOk && digitCount >= 10 && digitCount <= 15;
        },
        validatePasswordComplexity(val) {
            const pwd = String(val || "");
            const missing = [];
            if (pwd.length < 8) missing.push("at least 8 characters");
            if (!/[A-Z]/.test(pwd)) missing.push("1 uppercase letter (A-Z)");
            if (!/[a-z]/.test(pwd)) missing.push("1 lowercase letter (a-z)");
            if (!/[0-9]/.test(pwd)) missing.push("1 number (0-9)");
            if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) missing.push("1 special symbol (!@#$%^&*)");
            return {
                valid: missing.length === 0,
                message: missing.length ? "Password needs: " + missing.join(", ") + "." : ""
            };
        },
        setFieldState($input, errorMsg) {
            const $feedback = $input.siblings(".invalid-feedback").first();
            if (errorMsg) {
                $input.addClass("is-invalid").removeClass("is-valid");
                if ($feedback.length) $feedback.text(errorMsg).show();
                return false;
            } else {
                $input.removeClass("is-invalid").addClass("is-valid");
                if ($feedback.length) $feedback.text("").hide();
                return true;
            }
        }
    };

    // ======================================================================
    // 3. Web Audio API Sound Engine
    // ======================================================================
    const SoundEngine = {
        ctx: null,
        enabled: true,

        init() {
            if (!this.ctx) {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (AudioContextClass) {
                    this.ctx = new AudioContextClass();
                }
            }
            if (this.ctx && this.ctx.state === "suspended") {
                this.ctx.resume();
            }
        },

        toggleSound() {
            this.enabled = !this.enabled;
            safeSetStorage("mctiers_sound_enabled", this.enabled);
            this.updateButtonUI();
            if (this.enabled) {
                this.playClick();
            }
            return this.enabled;
        },

        updateButtonUI() {
            const $btn = $("#soundToggleBtn");
            if ($btn.length) {
                $btn.html(this.enabled ? "🔊 Sound: On" : "🔇 Sound: Off");
                $btn.attr("aria-pressed", this.enabled ? "true" : "false");
            }
        },

        playClick() {
            if (!this.enabled) return;
            try {
                this.init();
                if (!this.ctx) return;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(650, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.05);
                gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.05);
            } catch (err) {}
        },

        playStar(starIndex) {
            if (!this.enabled) return;
            try {
                this.init();
                if (!this.ctx) return;
                const scale = [261.63, 329.63, 392.00, 523.25, 659.25];
                const freq = scale[starIndex] || 440;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = "triangle";
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.22);
            } catch (err) {}
        },

        playSwitch() {
            if (!this.enabled) return;
            try {
                this.init();
                if (!this.ctx) return;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = "square";
                osc.frequency.setValueAtTime(320, this.ctx.currentTime);
                osc.frequency.setValueAtTime(480, this.ctx.currentTime + 0.04);
                gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.09);
            } catch (err) {}
        },

        playSuccess() {
            if (!this.enabled) return;
            try {
                this.init();
                if (!this.ctx) return;
                const notes = [392.00, 523.25, 659.25, 783.99];
                notes.forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    const startTime = this.ctx.currentTime + idx * 0.09;
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(freq, startTime);
                    gain.gain.setValueAtTime(0.15, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(startTime);
                    osc.stop(startTime + 0.2);
                });
            } catch (err) {}
        }
    };

    const savedSound = safeGetStorage("mctiers_sound_enabled");
    if (savedSound !== null) {
        SoundEngine.enabled = savedSound === "true";
    }
    SoundEngine.updateButtonUI();

    $("#soundToggleBtn").on("click", function () {
        const isEnabled = SoundEngine.toggleSound();
        showToast(isEnabled ? "Sound effects enabled" : "Sound effects muted", "info", isEnabled ? "🔊" : "🔇");
    });

    // ======================================================================
    // 4. Toast Notification System
    // ======================================================================
    function showToast(message, type = "info", icon = "⚡") {
        let $container = $("#toastContainer");
        if (!$container.length) {
            $container = $('<div id="toastContainer" class="toast-notification-container" aria-live="polite"></div>');
            $("body").append($container);
        }

        const $toast = $(`
            <div class="jq-toast toast-${type}" role="status">
                <div class="jq-toast-content">
                    <span class="jq-toast-icon">${icon}</span>
                    <span class="jq-toast-msg">${message}</span>
                    <button type="button" class="jq-toast-close" aria-label="Close notification">&times;</button>
                </div>
            </div>
        `);

        $container.append($toast);
        $toast.fadeIn(220).delay(3200).fadeOut(400, function () {
            $(this).remove();
        });

        $toast.find(".jq-toast-close").on("click", function () {
            $toast.stop(true, true).fadeOut(200, function () {
                $(this).remove();
            });
        });
    }

    // ======================================================================
    // 5. Scroll Progress Bar & Image Lazy Loading
    // ======================================================================
    function updateScrollProgress() {
        const scrollTop = $(window).scrollTop();
        const docHeight = $(document).height() - $(window).height();
        const scrollPercent = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;
        $("#scrollProgressBar").css("width", scrollPercent + "%");
    }

    $(window).on("scroll resize", updateScrollProgress);
    updateScrollProgress();

    function checkLazyImages() {
        const viewportBottom = $(window).scrollTop() + $(window).height() + 180;

        $("img.lazy-img:not(.lazy-loaded)").each(function () {
            const $img = $(this);
            const imgOffset = $img.offset();
            const imgTop = imgOffset ? imgOffset.top : 0;

            if (viewportBottom >= imgTop) {
                const realSrc = $img.attr("data-src");
                if (realSrc) {
                    $img.attr("src", realSrc);
                    $img.on("load", function () {
                        $img.addClass("lazy-loaded");
                    });
                    setTimeout(() => $img.addClass("lazy-loaded"), 80);
                }
            }
        });
    }

    $(window).on("scroll resize", checkLazyImages);
    checkLazyImages();

    // ======================================================================
    // 6. Copied to Clipboard Button
    // ======================================================================
    function copyTextToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).catch(() => fallbackCopyText(text));
        }
        return Promise.resolve(fallbackCopyText(text));
    }

    function fallbackCopyText(text) {
        const $temp = $("<textarea>");
        $("body").append($temp);
        $temp.val(text).select();
        document.execCommand("copy");
        $temp.remove();
    }

    function triggerCopiedFeedback($btn, copiedText) {
        const $icon = $btn.find(".copy-icon");
        const $label = $btn.find(".copy-text");
        const $tooltip = $btn.find(".copy-tooltip");

        const originalLabel = $btn.data("orig-label") || $label.text() || "Copy";
        if (!$btn.data("orig-label")) {
            $btn.data("orig-label", originalLabel);
        }

        $btn.addClass("copied");
        $icon.text("✓");
        $label.text("Copied!");
        $tooltip.stop(true, true).fadeIn(150).delay(1400).fadeOut(250);

        SoundEngine.playClick();
        showToast(`Copied to clipboard: "${copiedText.length > 36 ? copiedText.slice(0, 36) + "..." : copiedText}"`, "success", "📋");

        setTimeout(() => {
            $btn.removeClass("copied");
            $icon.text("📋");
            $label.text(originalLabel);
        }, 1800);
    }

    $(document).on("click", ".btn-copy-snippet", function () {
        const $btn = $(this);
        const targetSelector = $btn.attr("data-copy-target");
        let textToCopy = $btn.attr("data-copy-text") || "";

        if (targetSelector && $(targetSelector).length) {
            textToCopy = $(targetSelector).text().trim();
        }

        if (!textToCopy) return;

        copyTextToClipboard(textToCopy).then(() => {
            if (targetSelector && $(targetSelector).length) {
                $(targetSelector).trigger("copy");
            }
            triggerCopiedFeedback($btn, textToCopy);
        });
    });

    $(document).on("copy", ".copy-snippet-code", function () {
        const $code = $(this);
        $code.css("transition", "color 0.2s ease").css("color", "#10b981");
        setTimeout(() => $code.css("color", ""), 1000);
    });

    // ======================================================================
    // 7. Animated Number Counters
    // ======================================================================
    function animateNumberElement($el, targetValue, prefix = "", suffix = "", duration = 1600) {
        $({ countValue: 0 }).animate(
            { countValue: targetValue },
            {
                duration: duration,
                easing: "swing",
                step: function (now) {
                    $el.text(prefix + Math.floor(now).toLocaleString() + suffix);
                },
                complete: function () {
                    $el.text(prefix + Number(targetValue).toLocaleString() + suffix);
                }
            }
        );
    }

    function checkAnimatedCounters() {
        const viewportBottom = $(window).scrollTop() + $(window).height();

        $(".counter-num:not(.counted)").each(function () {
            const $counter = $(this);
            const offset = $counter.offset();
            if (offset && viewportBottom >= offset.top) {
                $counter.addClass("counted");
                const target = parseInt($counter.attr("data-target"), 10) || 0;
                const prefix = $counter.attr("data-prefix") || "";
                const suffix = $counter.attr("data-suffix") || "";
                animateNumberElement($counter, target, prefix, suffix, 1700);
            }
        });
    }

    $(window).on("scroll resize", checkAnimatedCounters);
    checkAnimatedCounters();

    // ======================================================================
    // 8. Search Highlighting & Autocomplete Helpers
    // ======================================================================
    function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function highlightTextInElements($elements, keyword) {
        let totalMatches = 0;

        $elements.each(function () {
            const $el = $(this);
            if ($el.data("original-html") === undefined) {
                $el.data("original-html", $el.html());
            }

            const cleanHTML = $el.data("original-html");
            $el.html(cleanHTML);

            if (!keyword || !keyword.trim()) {
                return;
            }

            const regex = new RegExp(`(${escapeRegExp(keyword.trim())})`, "gi");

            $el.contents().each(function walkNodes() {
                if (this.nodeType === 3) {
                    const text = this.nodeValue;
                    if (regex.test(text)) {
                        const matches = text.match(regex);
                        if (matches) totalMatches += matches.length;
                        const replaced = text.replace(regex, '<span class="raw-match">$1</span>');
                        const $tempWrapper = $("<span>").html(replaced);
                        $tempWrapper.find(".raw-match").wrap('<mark class="search-highlight"></mark>');
                        $(this).replaceWith($tempWrapper.contents());
                    }
                } else if (this.nodeType === 1 && this.nodeName !== "SCRIPT" && this.nodeName !== "BUTTON" && !$(this).hasClass("search-highlight")) {
                    $(this).contents().each(walkNodes);
                }
            });
        });

        return totalMatches;
    }

    function setupAutocomplete($input, $dropdown, getSuggestionsFn, onSelectCallback) {
        if (!$input.length || !$dropdown.length) return;

        $input.on("keyup focus", function (e) {
            if (["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(e.key)) {
                return;
            }

            const query = $input.val().trim();
            if (!query) {
                $dropdown.slideUp(120);
                return;
            }

            const suggestions = getSuggestionsFn(query);
            if (!suggestions.length) {
                $dropdown.slideUp(120);
                return;
            }

            const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
            const listHTML = suggestions.slice(0, 6).map(item => {
                const highlightedLabel = item.label.replace(regex, '<mark class="search-highlight">$1</mark>');
                return `
                    <li class="autocomplete-item" role="option" data-value="${item.value}">
                        <span>${highlightedLabel}</span>
                        <span class="autocomplete-category">${item.category}</span>
                    </li>
                `;
            }).join("");

            $dropdown.html(listHTML).stop(true, true).slideDown(140);
        });

        $input.on("keydown", function (e) {
            const $items = $dropdown.find(".autocomplete-item");
            if (!$dropdown.is(":visible") || !$items.length) return;

            let activeIdx = $items.index($items.filter(".active-suggestion"));

            if (e.key === "ArrowDown") {
                e.preventDefault();
                activeIdx = (activeIdx + 1) % $items.length;
                $items.removeClass("active-suggestion").eq(activeIdx).addClass("active-suggestion");
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                activeIdx = (activeIdx - 1 + $items.length) % $items.length;
                $items.removeClass("active-suggestion").eq(activeIdx).addClass("active-suggestion");
            } else if (e.key === "Enter" && activeIdx >= 0) {
                e.preventDefault();
                const chosenVal = $items.eq(activeIdx).attr("data-value");
                $input.val(chosenVal);
                $dropdown.slideUp(120);
                onSelectCallback(chosenVal);
            } else if (e.key === "Escape") {
                $dropdown.slideUp(120);
            }
        });

        $dropdown.on("click", ".autocomplete-item", function () {
            const chosenVal = $(this).attr("data-value");
            $input.val(chosenVal);
            $dropdown.slideUp(120);
            SoundEngine.playClick();
            onSelectCallback(chosenVal);
        });

        $(document).on("click", function (e) {
            if (!$(e.target).closest(".search-autocomplete-wrapper").length) {
                $dropdown.slideUp(120);
            }
        });
    }

    // ======================================================================
    // 9. Keyboard Navigation & Light/Dark Mode Switcher (Requirement 3)
    // ======================================================================
    function initKeyboardNavigation() {
        const navLinks = Array.from(document.querySelectorAll(".navbar-nav .nav-link"));
        if (!navLinks.length) return;

        function focusLink(targetIndex) {
            if (targetIndex >= 0 && targetIndex < navLinks.length) {
                navLinks.forEach(l => l.classList.remove("keyboard-focused"));
                const target = navLinks[targetIndex];
                target.focus();
                target.classList.add("keyboard-focused");
                SoundEngine.playClick();
            }
        }

        document.addEventListener("keydown", (event) => {
            const activeTag = document.activeElement ? document.activeElement.tagName : "";
            if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(activeTag)) return;

            let currentIndex = navLinks.indexOf(document.activeElement);
            let targetIndex = null;

            switch (event.key) {
                case "ArrowRight":
                case "ArrowDown":
                    event.preventDefault();
                    if (currentIndex === -1) {
                        const activePageIdx = navLinks.findIndex(l => l.classList.contains("active"));
                        targetIndex = activePageIdx !== -1 ? (activePageIdx + 1) % navLinks.length : 0;
                    } else {
                        targetIndex = (currentIndex + 1) % navLinks.length;
                    }
                    break;
                case "ArrowLeft":
                case "ArrowUp":
                    event.preventDefault();
                    if (currentIndex === -1) {
                        const activePageIdx = navLinks.findIndex(l => l.classList.contains("active"));
                        targetIndex = activePageIdx !== -1 ? (activePageIdx - 1 + navLinks.length) % navLinks.length : navLinks.length - 1;
                    } else {
                        targetIndex = (currentIndex - 1 + navLinks.length) % navLinks.length;
                    }
                    break;
                default:
                    return;
            }

            if (targetIndex !== null) {
                focusLink(targetIndex);
            }
        });

        navLinks.forEach(link => {
            link.addEventListener("blur", () => {
                link.classList.remove("keyboard-focused");
            });
        });
    }
    initKeyboardNavigation();

    function initThemeSwitcher() {
        const $themeBtn = $("#themeToggleBtn");
        const $body = $("body");

        const darkGradients = [
            "linear-gradient(135deg, #0d0f17, #171a26)",
            "linear-gradient(135deg, #111827, #1f2937)",
            "linear-gradient(135deg, #1e1b4b, #312e81)",
            "linear-gradient(135deg, #064e3b, #065f46)",
            "linear-gradient(135deg, #451a03, #78350f)",
            "linear-gradient(135deg, #3b0764, #581c87)"
        ];

        const lightGradients = [
            "linear-gradient(135deg, #f8fafc, #e2e8f0)",
            "linear-gradient(135deg, #e0f2fe, #bae6fd)",
            "linear-gradient(135deg, #ecfdf5, #d1fae5)",
            "linear-gradient(135deg, #fef3c7, #fde68a)",
            "linear-gradient(135deg, #f3e8ff, #e9d5ff)",
            "linear-gradient(135deg, #ffe4e6, #fecdd3)"
        ];

        let currentGrad = parseInt(safeGetStorage("mctiers_grad") || "0", 10);
        if (isNaN(currentGrad) || currentGrad < 0) currentGrad = 0;

        const applyActiveThemeAndGradient = (isLight, gradIdx) => {
            if ($themeBtn.length) {
                $themeBtn.html(isLight ? "☀️ Theme: Day" : "🌙 Theme: Night");
                $themeBtn.attr("aria-label", isLight ? "Switch to Night theme" : "Switch to Day theme");
            }
            const activePalette = isLight ? lightGradients : darkGradients;
            const safeIdx = gradIdx % activePalette.length;
            if (safeIdx > 0) {
                $body.css({
                    backgroundImage: activePalette[safeIdx],
                    backgroundAttachment: "fixed",
                    backgroundSize: "cover"
                });
            } else {
                $body.css("background-image", "");
            }
        };

        const savedTheme = safeGetStorage("mctiers_theme");
        const isInitialLight = savedTheme === "light";
        if (isInitialLight) {
            $body.addClass("light-theme");
        } else {
            $body.removeClass("light-theme");
        }
        applyActiveThemeAndGradient(isInitialLight, currentGrad);
        safeSetStorage("mctiers_theme", isInitialLight ? "light" : "dark");
        safeSetStorage("mctiers_grad", currentGrad);

        $themeBtn.on("click", function () {
            const isLight = $body.toggleClass("light-theme").hasClass("light-theme");
            currentGrad = 0;
            safeSetStorage("mctiers_theme", isLight ? "light" : "dark");
            safeSetStorage("mctiers_grad", 0);
            applyActiveThemeAndGradient(isLight, 0);
            SoundEngine.playSwitch();
            showToast(`Switched to ${isLight ? "Day (Light)" : "Night (Dark)"} mode`, "info", isLight ? "☀️" : "🌙");
        });

        $("#changeThemeBtn").on("click", function () {
            const isLight = $body.hasClass("light-theme");
            const activePalette = isLight ? lightGradients : darkGradients;
            currentGrad = (currentGrad + 1) % activePalette.length;
            safeSetStorage("mctiers_grad", currentGrad);
            applyActiveThemeAndGradient(isLight, currentGrad);
            SoundEngine.playClick();
            showToast("Arena background gradient updated!", "info", "🎨");
        });
    }
    initThemeSwitcher();

    // ======================================================================
    // 10. Time Greeting, Pro Tips, Read More, Arena Gallery & Star Rating
    // ======================================================================
    function initTimeGreeting() {
        const $greetingEl = $("#timeGreeting");
        const $greetingBadge = $("#greetingBadge");
        if (!$greetingEl.length) return;

        const hour = new Date().getHours();
        let message = "";
        let badge = "";

        switch (true) {
            case (hour >= 5 && hour < 12):
                message = "Good morning, Warrior! Ready for morning duels? ⚔️";
                badge = "Dawn Training";
                break;
            case (hour >= 12 && hour < 18):
                message = "Good afternoon, Champion! Tournament arenas are live! 🏆";
                badge = "Prime Battles";
                break;
            case (hour >= 18 && hour < 23):
                message = "Good evening, Gladiator! Evening showdowns active! 🌌";
                badge = "Night League";
                break;
            default:
                message = "Welcome, Shadow Duelist! Elite underground arena open! 🌙";
                badge = "Midnight Ops";
                break;
        }

        $greetingEl.text(message);
        if ($greetingBadge.length) $greetingBadge.text(badge);
    }
    initTimeGreeting();

    function initPvPTips() {
        const $tipText = $("#pvpTipContent");
        const $tipAuthor = $("#pvpTipAuthor");
        const $tipBtn = $("#newTipBtn");
        if (!$tipText.length || !$tipBtn.length) return;

        const tips = [
            { quote: "Critical hits require falling momentum — jump and strike precisely on the descent for maximum hearts.", author: "marble (HT1 Champion)" },
            { quote: "Always keep a water bucket in your hotbar; it resets fall damage and extinguishes flame aspect immediately.", author: "Itzrealme (Pot PvP Lead)" },
            { quote: "In Axe PvP, disable enemy shields with an axe sprint-hit before switching to your sword for combo follow-ups.", author: "Crozzor (Axe Tier Test Host)" },
            { quote: "Place End Crystals on obsidian diagonally to shield your hitbox while dealing lethal blast radius damage.", author: "VapeFly (Crystal Specialist)" },
            { quote: "Speed II potions increase your FOV and maneuverability — learn to W-tap to continuously reset enemy sprint.", author: "Speedster (Tier 1 Duelist)" },
            { quote: "Spacing is king: keeping a 3-block reach distance prevents enemies from starting counter-combos.", author: "Sharpness (EU Regional Winner)" }
        ];

        let lastIndex = 0;

        $tipBtn.on("click", function () {
            let nextIndex;
            do {
                nextIndex = Math.floor(Math.random() * tips.length);
            } while (nextIndex === lastIndex && tips.length > 1);

            lastIndex = nextIndex;
            const chosen = tips[nextIndex];

            $tipText.css("opacity", "0");
            setTimeout(() => {
                $tipText.text(`"${chosen.quote}"`);
                $tipAuthor.text(`— ${chosen.author}`);
                $tipText.css("opacity", "1");
            }, 180);

            SoundEngine.playClick();
        });
    }
    initPvPTips();

    function initReadMore() {
        const $readMoreBtn = $("#readMoreRulesBtn");
        const $extendedRules = $("#extendedRules");
        if (!$readMoreBtn.length || !$extendedRules.length) return;

        $readMoreBtn.on("click", function () {
            const isHidden = !$extendedRules.is(":visible");
            $extendedRules.slideToggle(250);
            $readMoreBtn.text(isHidden ? "Collapse Rules ↑" : "Read Extended Rules ↓");
            $readMoreBtn.attr("aria-expanded", isHidden ? "true" : "false");
            SoundEngine.playClick();
        });
    }
    initReadMore();

    function initArenaGallery() {
        const $displayImg = $("#arenaDisplayImg");
        const $displayTitle = $("#arenaDisplayTitle");
        const $displayDesc = $("#arenaDisplayDesc");
        const $displayBadge = $("#arenaDisplayBadge");
        const $thumbBtns = $(".arena-thumb-btn");

        if (!$displayImg.length || !$thumbBtns.length) return;

        const arenasData = {
            "overworld.jpg": {
                name: "Overworld Colosseum",
                badge: "Standard Duel Arena",
                desc: "Classic open-field battleground ideal for Sword 1.9+ spacing and shield mechanics under natural daylight."
            },
            "nether.jpg": {
                name: "Nether Fortress Bastion",
                badge: "Extreme Hazard",
                desc: "High-temperature arena surrounded by lava lakes. Testing fire-resistance management and tight corridor combat."
            },
            "end.jpg": {
                name: "The End Citadel",
                badge: "Crystal PvP Official",
                desc: "Void-edge arena with obsidian pillars designed exclusively for fast-paced End Crystal and anchor duels."
            },
            "dungeon.jpg": {
                name: "Ancient Stone Dungeon",
                badge: "Close Quarters",
                desc: "Subterranean stone labyrinth featuring claustrophobic corners where shield stun and axe crits dominate."
            },
            "portal.jpg": {
                name: "Ruined Portal Crossing",
                badge: "Hybrid Arena",
                desc: "Interdimensional gateway arena with uneven elevation challenges, crying obsidian blocks, and tactical cover."
            },
            "village.jpg": {
                name: "Desert Village Square",
                badge: "Tactical Skirmish",
                desc: "Urban combat testing rooftop traversal, parkour maneuvers, and multi-tier potion ambushes."
            }
        };

        $thumbBtns.on("click", function () {
            const $btn = $(this);
            const targetSrc = $btn.attr("data-src");
            const filename = $btn.attr("data-file");
            const arenaInfo = arenasData[filename] || {
                name: "Tournament Arena",
                badge: "Competitive",
                desc: "Official battleground for competitive tier test matches."
            };

            $thumbBtns.removeClass("active-thumb");
            $btn.addClass("active-thumb");
            $displayImg.addClass("fade-out");

            setTimeout(() => {
                $displayImg.attr("src", targetSrc).attr("data-src", targetSrc).attr("alt", arenaInfo.name).addClass("lazy-loaded");
                $displayTitle.text(arenaInfo.name);
                $displayBadge.text(arenaInfo.badge);
                $displayDesc.text(arenaInfo.desc);
                $displayImg.removeClass("fade-out");
            }, 150);

            SoundEngine.playClick();
            showToast(`Previewing Arena: ${arenaInfo.name}`, "info", "🏟️");
        });
    }
    initArenaGallery();

    function initStarRating() {
        const $starBtns = $(".star-btn");
        const $feedbackEl = $("#ratingFeedback");
        if (!$starBtns.length) return;

        let currentRating = parseInt(safeGetStorage("mctiers_hub_rating") || "0", 10) || 0;

        function updateStarsVisual(ratingCount, isHover = false) {
            $starBtns.each(function () {
                const $btn = $(this);
                const starVal = parseInt($btn.attr("data-star"), 10);
                if (starVal <= ratingCount) {
                    $btn.addClass(isHover ? "hovered" : "active");
                } else {
                    $btn.removeClass(isHover ? "hovered" : "active");
                }
            });
        }

        function getRatingMessage(rating) {
            switch (rating) {
                case 1: return "⭐ 1/5: Needs work — we are forging sharper swords!";
                case 2: return "⭐⭐ 2/5: Decent — arena repairs in progress.";
                case 3: return "⭐⭐⭐ 3/5: Solid battleground — Iron rank approved!";
                case 4: return "⭐⭐⭐⭐ 4/5: Epic league — Diamond Tier quality!";
                case 5: return "⭐⭐⭐⭐⭐ 5/5: Flawless Victory — Netherite Tier Legend!";
                default: return "Click a star to rate the championship!";
            }
        }

        if (currentRating > 0) {
            updateStarsVisual(currentRating, false);
            $feedbackEl.text(getRatingMessage(currentRating));
        }

        $starBtns.each(function (index) {
            const $btn = $(this);

            $btn.on("mouseenter", function () {
                const hoverVal = parseInt($btn.attr("data-star"), 10);
                updateStarsVisual(hoverVal, true);
            });

            $btn.on("mouseleave", function () {
                $starBtns.removeClass("hovered");
                updateStarsVisual(currentRating, false);
            });

            $btn.on("click", function () {
                currentRating = parseInt($btn.attr("data-star"), 10);
                safeSetStorage("mctiers_hub_rating", currentRating);
                updateStarsVisual(currentRating, false);

                $btn.addClass("pulse");
                setTimeout(() => $btn.removeClass("pulse"), 300);

                const msg = getRatingMessage(currentRating);
                $feedbackEl.text(msg).css("color", currentRating >= 4 ? "#10b981" : "#59c7f5");

                SoundEngine.playStar(index);
                showToast(`Thank you! Saved your ${currentRating}/5 star rating.`, "success", "⭐");
            });
        });
    }
    initStarRating();

    // ======================================================================
    // 11. Requirement 5.3: Matches Search, Filter & LocalStorage Bookmarking
    // ======================================================================
    const MATCHES_CATALOG = [
        {
            id: 1,
            title: "Grand Final: Sword 1.19",
            discipline: "Sword",
            date: "Nov 25, 18:00 UTC",
            desc: "Showdown between marble and Itzrealme for top seasonal championship rank.",
            image: "images/sword-duel.png",
            action: "Enter Queue"
        },
        {
            id: 2,
            title: "Crystal Tier Test",
            discipline: "Crystal",
            date: "Nov 28, 16:00 UTC",
            desc: "Official qualification duels for High Tier 1 and High Tier 2 ranks.",
            image: "images/crys-removebg-preview.png",
            action: "Register Test"
        },
        {
            id: 3,
            title: "Pot PvP 1.8 Showdown",
            discipline: "Pot",
            date: "Dec 2, 19:00 UTC",
            desc: "Classic competitive potion duels with a $5,000 seasonal cash prize pool.",
            image: "images/PotionDuels.webp",
            action: "Join Bracket"
        },
        {
            id: 4,
            title: "Heavy Shield & Axe Clash",
            discipline: "Axe",
            date: "Dec 8, 17:00 UTC",
            desc: "Brutal axe combat focusing on critical hits and tactical shield breaks.",
            image: "images/sword-duel.png",
            action: "Enter Queue"
        },
        {
            id: 5,
            title: "End Crystal Blast Invitational",
            discipline: "Crystal",
            date: "Dec 15, 20:00 UTC",
            desc: "World tier invitational tournament with double elimination brackets.",
            image: "images/crys-removebg-preview.png",
            action: "Join Bracket"
        },
        {
            id: 6,
            title: "Pot Speed Sprint Masters",
            discipline: "Pot",
            date: "Dec 22, 18:30 UTC",
            desc: "High-octane nodebuff matches with instant health II inventory kits.",
            image: "images/PotionDuels.webp",
            action: "Enter Queue"
        }
    ];

    function getSavedMatchIds() {
        return safeGetJSON("mctiers_saved_matches", [1]);
    }

    function toggleSavedMatch(matchId) {
        let saved = getSavedMatchIds();
        const idNum = Number(matchId);
        let added = false;
        if (saved.includes(idNum)) {
            saved = saved.filter(id => id !== idNum);
        } else {
            saved.push(idNum);
            added = true;
        }
        safeSetJSON("mctiers_saved_matches", saved);
        $("#savedMatchesCountBadge").text(saved.length);
        return added;
    }

    function initMatchFilterAndSearch() {
        const $container = $("#matchesContainer");
        const $filterBtns = $(".btn-match-filter");
        const $searchInput = $("#matchSearchInput");
        const $autocomplete = $("#matchAutocompleteList");
        const $clearBtn = $("#clearMatchSearchBtn");

        if (!$container.length) return;

        let selectedDiscipline = safeGetStorage("mctiers_match_filter") || "All";
        const savedSearchQuery = safeGetStorage("mctiers_match_query") || "";
        if (savedSearchQuery) $searchInput.val(savedSearchQuery);

        $filterBtns.removeClass("active");
        $filterBtns.filter(`[data-discipline="${selectedDiscipline}"]`).addClass("active");
        if (!$filterBtns.filter(".active").length) {
            selectedDiscipline = "All";
            $filterBtns.first().addClass("active");
        }

        function getBadgeClass(discipline) {
            switch (discipline) {
                case "Sword": return "bg-primary";
                case "Axe": return "bg-warning text-dark";
                case "Crystal": return "bg-danger";
                case "Pot": return "bg-success";
                default: return "bg-info text-dark";
            }
        }

        function renderAllMatches() {
            const placeholderSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 180'%3E%3Crect width='300' height='180' fill='%23141824'/%3E%3C/svg%3E";
            const savedIds = getSavedMatchIds();
            $("#savedMatchesCountBadge").text(savedIds.length);

            const cardsHTML = MATCHES_CATALOG.map(match => {
                const isSaved = savedIds.includes(match.id);
                return `
                <div class="col-md-6 col-lg-4 match-item-col" data-discipline="${match.discipline}" data-match-id="${match.id}">
                    <div class="card match-card h-100 bg-dark border-secondary">
                        <img src="${placeholderSvg}" data-src="${match.image}" class="card-img-top pixel-icon lazy-img" alt="${match.title}">
                        <div class="card-body d-flex flex-column text-light">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="badge ${getBadgeClass(match.discipline)} match-searchable">${match.discipline}</span>
                                <small class="text-secondary">Match #${match.id}</small>
                            </div>
                            <h3 class="card-title text-info h5 match-searchable">${match.title}</h3>
                            <p class="card-text match-searchable">${match.desc}</p>
                            <p class="card-text mt-auto"><strong>Date:</strong> <span class="match-searchable">${match.date}</span></p>
                            <div class="d-flex gap-2 mt-3">
                                <a href="contact.html" class="btn btn-outline-info flex-grow-1 btn-animated">${match.action}</a>
                                <button type="button" class="btn btn-outline-warning btn-bookmark-item ${isSaved ? "bookmarked" : ""}" data-match-id="${match.id}" title="Save match to localStorage">
                                    ${isSaved ? "★ Saved" : "☆ Save"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            }).join("");

            $container.html(cardsHTML);
            checkLazyImages();
        }

        function applyLiveMatchFilter() {
            const query = ($searchInput.val() || "").trim().toLowerCase();
            safeSetStorage("mctiers_match_query", query);
            safeSetStorage("mctiers_match_filter", selectedDiscipline);

            const savedIds = getSavedMatchIds();
            $("#savedMatchesCountBadge").text(savedIds.length);

            const $cols = $container.find(".match-item-col");
            const $matchingCols = $cols.filter(function () {
                const $col = $(this);
                const disc = $col.attr("data-discipline");
                const mId = parseInt($col.attr("data-match-id"), 10);

                let matchesDisc = true;
                if (selectedDiscipline === "Saved") {
                    matchesDisc = savedIds.includes(mId);
                } else if (selectedDiscipline !== "All") {
                    matchesDisc = disc === selectedDiscipline;
                }

                const cardText = $col.text().toLowerCase();
                const matchesQuery = !query || cardText.indexOf(query) !== -1;
                return matchesDisc && matchesQuery;
            });

            $cols.hide();
            $matchingCols.fadeIn(180);

            $("#noMatchesAlert").remove();
            if ($matchingCols.length === 0) {
                $container.append(`
                    <div id="noMatchesAlert" class="col-12 text-center py-4 text-muted">
                        No matches found for filter "${selectedDiscipline}" ${query ? `and search "${$searchInput.val()}"` : ""}.
                    </div>
                `);
            }

            highlightTextInElements($container.find(".match-searchable"), query);
            highlightTextInElements($(".searchable-content"), query);
            checkLazyImages();
        }

        renderAllMatches();
        applyLiveMatchFilter();

        $(document).on("click", ".btn-bookmark-item[data-match-id]", function () {
            const $btn = $(this);
            const matchId = parseInt($btn.attr("data-match-id"), 10);
            const matchObj = MATCHES_CATALOG.find(m => m.id === matchId);
            const added = toggleSavedMatch(matchId);

            if (added) {
                $btn.addClass("bookmarked").text("★ Saved");
                SoundEngine.playStar(3);
                showToast(`Saved "${matchObj ? matchObj.title : "Match"}" to your Profile!`, "success", "⭐");
            } else {
                $btn.removeClass("bookmarked").text("☆ Save");
                SoundEngine.playClick();
                showToast(`Removed match from saved list.`, "info", "🗑️");
            }

            if (selectedDiscipline === "Saved") {
                applyLiveMatchFilter();
            }
        });

        $searchInput.on("keyup input", function () {
            applyLiveMatchFilter();
        });

        $clearBtn.on("click", function () {
            $searchInput.val("");
            $autocomplete.slideUp(120);
            applyLiveMatchFilter();
            SoundEngine.playClick();
        });

        const matchSuggestionsPool = [
            ...MATCHES_CATALOG.map(m => ({ label: m.title, value: m.title, category: m.discipline })),
            { label: "Sword (1.9+ Duels)", value: "Sword", category: "Discipline" },
            { label: "Axe & Shield PvP", value: "Axe", category: "Discipline" },
            { label: "Crystal PvP", value: "Crystal", category: "Discipline" },
            { label: "Pot PvP (Nodebuff)", value: "Pot", category: "Discipline" },
            { label: "marble vs Itzrealme", value: "marble", category: "Featured Player" }
        ];

        setupAutocomplete(
            $searchInput,
            $autocomplete,
            function (query) {
                const q = query.toLowerCase();
                return matchSuggestionsPool.filter(item => item.label.toLowerCase().includes(q));
            },
            function () {
                applyLiveMatchFilter();
            }
        );

        $filterBtns.on("click", function () {
            const $btn = $(this);
            $filterBtns.removeClass("active");
            $btn.addClass("active");
            selectedDiscipline = $btn.attr("data-discipline");
            applyLiveMatchFilter();
            SoundEngine.playSwitch();
            showToast(`Filtered matches by: ${selectedDiscipline} (saved in localStorage)`, "info", "⚔️");
        });
    }
    initMatchFilterAndSearch();

    // ======================================================================
    // 12. Leaderboard Search, Filter, Watchlist & REST Countries API
    // ======================================================================
    const LEADERBOARD_PLAYERS = [
        { rank: 1, name: "marble", country: "Kazakhstan", countryCode: "KZ", points: 300, tier: "HT1", discipline: "Sword", wins: 142 },
        { rank: 2, name: "Itzrealme", country: "United States", countryCode: "US", points: 295, tier: "HT1", discipline: "Pot", wins: 138 },
        { rank: 3, name: "Crozzor", country: "United States", countryCode: "US", points: 290, tier: "HT1", discipline: "Axe", wins: 131 },
        { rank: 4, name: "Kylaz", country: "United States", countryCode: "US", points: 285, tier: "HT1", discipline: "Sword", wins: 125 },
        { rank: 5, name: "Sharpness", country: "Germany", countryCode: "DE", points: 275, tier: "HT1", discipline: "Sword", wins: 119 },
        { rank: 6, name: "Refraction", country: "Canada", countryCode: "CA", points: 260, tier: "LT1", discipline: "Pot", wins: 110 },
        { rank: 7, name: "VapeFly", country: "United Kingdom", countryCode: "GB", points: 250, tier: "LT1", discipline: "Crystal", wins: 104 },
        { rank: 8, name: "Speedster", country: "France", countryCode: "FR", points: 240, tier: "HT2", discipline: "Pot", wins: 98 },
        { rank: 9, name: "BlockHitter", country: "Brazil", countryCode: "BR", points: 230, tier: "HT2", discipline: "Sword", wins: 91 },
        { rank: 10, name: "DiamondPvP", country: "Japan", countryCode: "JP", points: 215, tier: "LT2", discipline: "Axe", wins: 85 }
    ];

    function getSavedPlayerNames() {
        return safeGetJSON("mctiers_saved_players", ["marble"]);
    }

    function toggleSavedPlayer(playerName) {
        let list = getSavedPlayerNames();
        let added = false;
        if (list.includes(playerName)) {
            list = list.filter(n => n !== playerName);
        } else {
            list.push(playerName);
            added = true;
        }
        safeSetJSON("mctiers_saved_players", list);
        $("#savedPlayersCountBadge").text(list.length);
        return added;
    }

    function initLeaderboard() {
        const $tableBody = $("#leaderboardTableBody");
        const $searchInput = $("#leaderboardSearch");
        const $autocomplete = $("#leaderboardAutocomplete");
        const $clearBtn = $("#clearLbSearchBtn");
        const $filterBtns = $(".btn-lb-filter");

        if (!$tableBody.length) return;

        const totalPoints = LEADERBOARD_PLAYERS.reduce((acc, curr) => acc + curr.points, 0);
        const $totalPointsEl = $("#statTotalPoints");
        const $topScoreEl = $("#statTopScore");
        const $countEl = $("#statPlayerCount");

        if ($totalPointsEl.length) animateNumberElement($totalPointsEl, totalPoints, "", "", 1600);
        if ($topScoreEl.length && LEADERBOARD_PLAYERS[0]) {
            $topScoreEl.text(`${LEADERBOARD_PLAYERS[0].name} (${LEADERBOARD_PLAYERS[0].points}p)`);
        }
        if ($countEl.length) animateNumberElement($countEl, LEADERBOARD_PLAYERS.length, "", "", 1200);

        let activeDiscipline = safeGetStorage("mctiers_lb_filter") || "All";
        const savedLbQuery = safeGetStorage("mctiers_lb_query") || "";
        if (savedLbQuery) $searchInput.val(savedLbQuery);

        $filterBtns.removeClass("active");
        $filterBtns.filter(`[data-discipline="${activeDiscipline}"]`).addClass("active");
        if (!$filterBtns.filter(".active").length) {
            activeDiscipline = "All";
            $filterBtns.first().addClass("active");
        }

        function getTierBadgeClass(tier) {
            switch (tier) {
                case "HT1": return "tier-ht1";
                case "LT1": return "tier-lt1";
                case "HT2": return "tier-ht2";
                case "LT2": return "tier-lt2";
                default: return "bg-secondary";
            }
        }

        function renderAllPlayers() {
            const savedNames = getSavedPlayerNames();
            $("#savedPlayersCountBadge").text(savedNames.length);

            const rowsHTML = LEADERBOARD_PLAYERS.map(p => {
                const isWatched = savedNames.includes(p.name);
                return `
                <tr class="leaderboard-row" data-discipline="${p.discipline}" data-player="${p.name}">
                    <td>#${p.rank}</td>
                    <td><strong class="lb-searchable" id="playerIgn-${p.rank}">${p.name}</strong></td>
                    <td>
                        <button type="button" class="country-lookup-btn lb-searchable" data-country="${p.country}" title="Fetch live API data for ${p.country}">
                            🌐 ${p.country} (${p.countryCode})
                        </button>
                    </td>
                    <td>${p.points} Pts <span class="tier-badge ${getTierBadgeClass(p.tier)} ms-1 lb-searchable">${p.tier}</span></td>
                    <td><span class="badge bg-dark border border-secondary lb-searchable">${p.discipline}</span></td>
                    <td>${p.wins} Wins</td>
                    <td>
                        <div class="d-flex gap-1 flex-wrap">
                            <button type="button" class="btn-copy-snippet btn-Watch-player ${isWatched ? "copied" : ""}" data-watch-player="${p.name}" aria-label="Bookmark ${p.name}">
                                ${isWatched ? "★ Watched" : "☆ Watch"}
                            </button>
                            <button type="button" class="btn-copy-snippet" data-copy-text="${p.name} (${p.tier} - ${p.points} Pts)" aria-label="Copy ${p.name} stats">
                                <span class="copy-icon">📋</span> <span class="copy-text">Copy</span>
                                <span class="copy-tooltip">Copied to clipboard!</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            }).join("");

            $tableBody.html(rowsHTML);
        }

        function filterLeaderboardRows() {
            const query = ($searchInput.val() || "").trim().toLowerCase();
            safeSetStorage("mctiers_lb_query", query);
            safeSetStorage("mctiers_lb_filter", activeDiscipline);

            const savedNames = getSavedPlayerNames();
            $("#savedPlayersCountBadge").text(savedNames.length);

            const $rows = $tableBody.find(".leaderboard-row");
            const $matchedRows = $rows.filter(function () {
                const $row = $(this);
                const disc = $row.attr("data-discipline");
                const pName = $row.attr("data-player");

                let matchDisc = true;
                if (activeDiscipline === "Saved") {
                    matchDisc = savedNames.includes(pName);
                } else if (activeDiscipline !== "All") {
                    matchDisc = disc === activeDiscipline;
                }

                const rowText = $row.find(".lb-searchable").text().toLowerCase();
                const matchSearch = !query || rowText.indexOf(query) !== -1;
                return matchDisc && matchSearch;
            });

            $rows.hide();
            $matchedRows.show();

            $("#noLbPlayersRow").remove();
            if ($matchedRows.length === 0) {
                $tableBody.append(`
                    <tr id="noLbPlayersRow">
                        <td colspan="7" class="text-center py-4 text-muted">No contenders found matching your filter criteria.</td>
                    </tr>
                `);
            }

            highlightTextInElements($tableBody.find(".lb-searchable"), query);
        }

        renderAllPlayers();
        filterLeaderboardRows();

        $(document).on("click", ".btn-Watch-player", function () {
            const $btn = $(this);
            const playerName = $btn.attr("data-watch-player");
            const added = toggleSavedPlayer(playerName);

            if (added) {
                $btn.addClass("copied").text("★ Watched");
                SoundEngine.playStar(4);
                showToast(`Added ${playerName} to your Profile Watchlist!`, "success", "⭐");
            } else {
                $btn.removeClass("copied").text("☆ Watch");
                SoundEngine.playClick();
                showToast(`Removed ${playerName} from Watchlist.`, "info", "🗑️");
            }

            if (activeDiscipline === "Saved") {
                filterLeaderboardRows();
            }
        });

        $searchInput.on("keyup input", function () {
            filterLeaderboardRows();
        });

        $clearBtn.on("click", function () {
            $searchInput.val("");
            $autocomplete.slideUp(120);
            filterLeaderboardRows();
            SoundEngine.playClick();
        });

        const lbSuggestionsPool = [
            ...LEADERBOARD_PLAYERS.map(p => ({ label: `${p.name} — ${p.country}`, value: p.name, category: `${p.tier} • ${p.discipline}` })),
            { label: "Kazakhstan (KZ)", value: "Kazakhstan", category: "Country" },
            { label: "United States (US)", value: "United States", category: "Country" },
            { label: "Germany (DE)", value: "Germany", category: "Country" },
            { label: "HT1 (High Tier 1)", value: "HT1", category: "Tier" },
            { label: "LT1 (Low Tier 1)", value: "LT1", category: "Tier" }
        ];

        setupAutocomplete(
            $searchInput,
            $autocomplete,
            function (query) {
                const q = query.toLowerCase();
                return lbSuggestionsPool.filter(item =>
                    item.label.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
                );
            },
            function () {
                filterLeaderboardRows();
            }
        );

        $filterBtns.on("click", function () {
            const $btn = $(this);
            $filterBtns.removeClass("active");
            $btn.addClass("active");
            activeDiscipline = $btn.attr("data-discipline");
            filterLeaderboardRows();
            SoundEngine.playSwitch();
            showToast(`Leaderboard filtered by: ${activeDiscipline} (saved in localStorage)`, "info", "🏆");
        });
    }
    initLeaderboard();

    // ======================================================================
    // 13. Requirement 7: External Public API Integrations (async/await + fetch)
    // ======================================================================

    // API #1: Open-Meteo Live Server Node Weather & Telemetry API (index.html)
    async function fetchServerNodeTelemetry(city, lat, lon, regionLabel) {
        const $loading = $("#serverWeatherLoading");
        const $error = $("#serverWeatherError");
        const $errorMsg = $("#serverWeatherErrorMsg");
        const $result = $("#serverWeatherResult");

        if (!$result.length) return;

        $error.attr("style", "display: none !important;");
        $result.hide();
        $loading.show();

        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current_weather=true`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}`);
            }
            const data = await response.json();
            if (!data || !data.current_weather) {
                throw new Error("Invalid telemetry payload received");
            }

            const cw = data.current_weather;
            const temp = cw.temperature;
            const wind = cw.windspeed;
            const isDay = cw.is_day === 1 ? "Daylight Cycle ☀️" : "Night Cycle 🌙";
            const simulatedPing = city === "Astana" ? "18 ms" : (city === "Frankfurt" ? "42 ms" : (city === "Ashburn" ? "95 ms" : "112 ms"));

            $loading.hide();
            $result.html(`
                <div class="col-md-3 col-6">
                    <div class="stat-card py-3">
                        <div class="small text-muted">Data Center Hub</div>
                        <div class="h5 text-info mb-0 mt-1">${city}</div>
                        <small class="text-secondary">${regionLabel}</small>
                    </div>
                </div>
                <div class="col-md-3 col-6">
                    <div class="stat-card py-3">
                        <div class="small text-muted">Exterior Temp (API)</div>
                        <div class="h4 text-warning mb-0 mt-1">${temp} °C</div>
                        <small class="text-secondary">${isDay}</small>
                    </div>
                </div>
                <div class="col-md-3 col-6">
                    <div class="stat-card py-3">
                        <div class="small text-muted">Wind Speed (API)</div>
                        <div class="h4 text-success mb-0 mt-1">${wind} km/h</div>
                        <small class="text-secondary">Cooling Optimal</small>
                    </div>
                </div>
                <div class="col-md-3 col-6">
                    <div class="stat-card py-3">
                        <div class="small text-muted">Arena Routing Ping</div>
                        <div class="h4 text-info mb-0 mt-1">${simulatedPing}</div>
                        <small class="text-success">● 20.0 TPS Stable</small>
                    </div>
                </div>
            `).fadeIn(220);
        } catch (err) {
            $loading.hide();
            $errorMsg.text(`Failed to load live server telemetry (${err.message}). Please check your connection and retry.`);
            $error.attr("style", "display: flex !important;");
        }
    }

    function initServerWeatherApi() {
        const $nodeBtns = $(".btn-server-node");
        if (!$nodeBtns.length) return;

        let currentNode = {
            city: "Astana",
            lat: "51.1694",
            lon: "71.4491",
            region: "Central Asia Hub (KZ)"
        };

        fetchServerNodeTelemetry(currentNode.city, currentNode.lat, currentNode.lon, currentNode.region);

        $nodeBtns.on("click", function () {
            const $btn = $(this);
            $nodeBtns.removeClass("active");
            $btn.addClass("active");
            currentNode = {
                city: $btn.attr("data-city"),
                lat: $btn.attr("data-lat"),
                lon: $btn.attr("data-lon"),
                region: $btn.attr("data-region")
            };
            SoundEngine.playClick();
            fetchServerNodeTelemetry(currentNode.city, currentNode.lat, currentNode.lon, currentNode.region);
        });

        $("#retryWeatherApiBtn").on("click", function () {
            SoundEngine.playClick();
            fetchServerNodeTelemetry(currentNode.city, currentNode.lat, currentNode.lon, currentNode.region);
        });
    }
    initServerWeatherApi();

    // API #2: REST Countries Public API (leaderboard.html)
    async function fetchCountryIntelligence(countryName) {
        const $loading = $("#countryApiLoading");
        const $error = $("#countryApiError");
        const $errorMsg = $("#countryApiErrorMsg");
        const $result = $("#countryApiResult");

        if (!$result.length) return;

        const cleanQuery = String(countryName || "").trim();
        if (!cleanQuery) {
            $errorMsg.text("Please enter a valid country name.");
            $error.show();
            return;
        }

        $error.hide();
        $result.hide();
        $loading.show();

        try {
            const response = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanQuery)}&count=1&language=en&format=json`
            );
            if (!response.ok) {
                throw new Error(`Country "${cleanQuery}" lookup failed (HTTP ${response.status})`);
            }
            const data = await response.json();
            if (!data || !Array.isArray(data.results) || !data.results.length) {
                throw new Error(`Country "${cleanQuery}" not found`);
            }

            const place = data.results[0];
            const commonName = place.country || place.name || cleanQuery;
            const officialName = place.name ? `${place.name} (${place.country_code || "INTL"})` : commonName;
            const capitalsMap = {
                KZ: "Astana", US: "Washington, D.C.", DE: "Berlin",
                CA: "Ottawa", GB: "London", FR: "Paris", BR: "Brasília", JP: "Tokyo"
            };
            const capital = capitalsMap[place.country_code] || `${place.latitude.toFixed(2)}°, ${place.longitude.toFixed(2)}°`;
            const region = place.timezone ? place.timezone.split("/")[0] : "Global";
            const subregion = place.country_code ? `ISO: ${place.country_code}` : "Verified";
            const population = place.population ? Number(place.population).toLocaleString() : "N/A";
            const timezones = place.timezone || "UTC";
            const flagUrl = place.country_code ? `https://flagcdn.com/w160/${place.country_code.toLowerCase()}.png` : "";
            $loading.hide();
            $result.html(`
                <div class="d-flex align-items-center gap-3 flex-wrap mb-3">
                    ${flagUrl ? `<img src="${flagUrl}" alt="${commonName} flag" class="country-flag-img">` : ""}
                    <div>
                        <span class="badge bg-primary mb-1">${region} • ${subregion}</span>
                        <h3 class="h5 text-info mb-0">${commonName}</h3>
                        <small class="text-muted">${officialName}</small>
                    </div>
                </div>
                <div class="row g-2 small">
                    <div class="col-sm-4">
                        <div class="p-2 rounded bg-dark border border-secondary">
                            <span class="text-muted d-block">Capital City</span>
                            <strong>${capital}</strong>
                        </div>
                    </div>
                    <div class="col-sm-4">
                        <div class="p-2 rounded bg-dark border border-secondary">
                            <span class="text-muted d-block">Population</span>
                            <strong class="text-success">${population}</strong>
                        </div>
                    </div>
                    <div class="col-sm-4">
                        <div class="p-2 rounded bg-dark border border-secondary">
                            <span class="text-muted d-block">Timezones</span>
                            <strong class="text-warning">${timezones}</strong>
                        </div>
                    </div>
                </div>
            `).fadeIn(220);
        } catch (err) {
            $loading.hide();
            $errorMsg.text(err.message || "Failed to fetch data from REST Countries API.");
            $error.fadeIn(180);
        }
    }

    function initCountryApiExplorer() {
        const $input = $("#countryApiInput");
        const $btn = $("#fetchCountryApiBtn");
        if (!$input.length || !$btn.length) return;

        fetchCountryIntelligence($input.val() || "Kazakhstan");

        $btn.on("click", function () {
            SoundEngine.playClick();
            fetchCountryIntelligence($input.val());
        });

        $input.on("keydown", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                SoundEngine.playClick();
                fetchCountryIntelligence($input.val());
            }
        });

        $(document).on("click", ".btn-quick-country, .country-lookup-btn", function () {
            const chosenCountry = $(this).attr("data-country");
            if (chosenCountry) {
                $input.val(chosenCountry);
                SoundEngine.playClick();
                fetchCountryIntelligence(chosenCountry);
                showToast(`Fetched REST Countries API data for ${chosenCountry}`, "info", "🌍");
            }
        });
    }
    initCountryApiExplorer();

    // API #3: PlayerDB Minecraft Account Lookup API (profile.html)
    async function fetchMinecraftProfileApi(ign) {
        const $loading = $("#mcApiLoading");
        const $error = $("#mcApiError");
        const $result = $("#mcApiResultBox");

        if (!$result.length) return;

        const cleanIgn = String(ign || "").trim();
        if (!cleanIgn) {
            $error.text("Please enter a Minecraft username to query.").show();
            return;
        }

        $error.hide();
        $result.empty();
        $loading.show();

        try {
            const response = await fetch(`https://playerdb.co/api/player/minecraft/${encodeURIComponent(cleanIgn)}`);
            if (!response.ok) {
                throw new Error(`Player "${cleanIgn}" not found on Mojang servers`);
            }
            const payload = await response.json();
            if (!payload || !payload.success || !payload.data || !payload.data.player) {
                throw new Error(`No Mojang account found for "${cleanIgn}"`);
            }

            const player = payload.data.player;
            const avatarUrl = player.avatar || `https://mc-heads.net/avatar/${encodeURIComponent(cleanIgn)}/80`;

            $loading.hide();
            $("#profileMcAvatar").attr("src", avatarUrl);
            $result.html(`
                <div class="d-flex align-items-center gap-3 p-2 rounded border border-secondary">
                    <img src="${avatarUrl}" alt="${player.username}" width="48" height="48" class="rounded border border-info">
                    <div>
                        <div class="fw-bold text-info">Verified Mojang Account: ${player.username}</div>
                        <div class="text-muted" style="font-size: 0.78rem;">UUID: <code>${player.id}</code></div>
                    </div>
                </div>
            `);
        } catch (err) {
            $loading.hide();
            $error.text(`API Notice: ${err.message}. Showing default tournament avatar.`).show();
        }
    }

    // ======================================================================
    // 14. FAQ Search & Subscription Modal (Requirement 5.2 compliant)
    // ======================================================================
    function initFaqSearchAndHighlighting() {
        const $faqSearch = $("#faqSearchInput");
        const $faqAutocomplete = $("#faqAutocompleteList");
        const $clearFaqBtn = $("#clearFaqSearchBtn");
        const $statusEl = $("#faqHighlightStatus");

        if (!$faqSearch.length) return;

        const faqSuggestions = [
            { label: "MCTiers League ranking platform", value: "MCTiers League", category: "FAQ" },
            { label: "Sword 1.9+ & Axe PvP disciplines", value: "Sword", category: "Discipline" },
            { label: "End Crystal & Pot PvP combat", value: "Crystal", category: "Discipline" },
            { label: "Sign Up, Log In & Profile localStorage", value: "Profile", category: "Auth" },
            { label: "Lunar Client & Badlion Client rules", value: "Client", category: "Rules" },
            { label: "Batyrkhan Uvayev — Lead Organizer", value: "Batyrkhan", category: "Team" },
            { label: "Yermek Sain — UI/UX Systems Engineer", value: "Yermek", category: "Team" }
        ];

        function performFaqSearchAndHighlight() {
            const keyword = ($faqSearch.val() || "").trim();
            const $faqItems = $("#faqAccordionContainer .faq-item");
            const $searchableTextEls = $(".faq-q-text, .faq-a-text, #aboutTeamSection p, #aboutTeamSection h3");

            const matchCount = highlightTextInElements($searchableTextEls, keyword);

            if (!keyword) {
                $faqItems.show();
                $statusEl.text("");
                return;
            }

            const lowerKey = keyword.toLowerCase();
            $faqItems.each(function () {
                const $item = $(this);
                const text = $item.text().toLowerCase();
                const isMatch = text.indexOf(lowerKey) !== -1;

                if (isMatch) {
                    $item.stop(true, true).fadeIn(150);
                    const $qBtn = $item.find(".faq-question");
                    const $ans = $item.find(".faq-answer");
                    $qBtn.addClass("active").attr("aria-expanded", "true");
                    $ans.addClass("open").attr("aria-hidden", "false");
                } else {
                    $item.stop(true, true).fadeOut(150);
                }
            });

            $statusEl.text(
                matchCount > 0
                    ? `Highlighted ${matchCount} matching word${matchCount === 1 ? "" : "s"} for "${keyword}"`
                    : `No matches found for "${keyword}"`
            );
        }

        $faqSearch.on("keyup input", performFaqSearchAndHighlight);

        $clearFaqBtn.on("click", function () {
            $faqSearch.val("");
            $faqAutocomplete.slideUp(120);
            performFaqSearchAndHighlight();
            SoundEngine.playClick();
        });

        setupAutocomplete(
            $faqSearch,
            $faqAutocomplete,
            function (query) {
                const q = query.toLowerCase();
                return faqSuggestions.filter(item =>
                    item.label.toLowerCase().includes(q) || item.value.toLowerCase().includes(q)
                );
            },
            performFaqSearchAndHighlight
        );
    }
    initFaqSearchAndHighlighting();

    // Custom FAQ Accordion
    $(".faq-question").on("click", function () {
        const $question = $(this);
        const answerId = $question.attr("aria-controls");
        const $answer = $("#" + answerId);
        if (!$answer.length) return;

        const isOpen = $question.attr("aria-expanded") === "true";

        $(".faq-question").each(function () {
            const $other = $(this);
            const $otherAns = $("#" + $other.attr("aria-controls"));
            $other.removeClass("active").attr("aria-expanded", "false");
            $otherAns.removeClass("open").attr("aria-hidden", "true");
        });

        if (!isOpen) {
            $question.addClass("active").attr("aria-expanded", "true");
            $answer.addClass("open").attr("aria-hidden", "false");
        }
        SoundEngine.playClick();
    });

    // Newsletter Subscription Popup with full JS validation (Requirement 5.2)
    const $subscribeOverlay = $("#subscribeOverlay");
    if ($subscribeOverlay.length) {
        const $openBtn = $("#openSubscribe");
        const $closeBtn = $("#closeSubscribe");
        const $subForm = $("#subscribeForm");
        const $nameInput = $("#subscribeName");
        const $emailInput = $("#subscribeEmail");
        const $phoneInput = $("#subscribePhone");
        const $passInput = $("#subscribePass");
        const $msgEl = $("#subscribeMessage");
        const $subSubmitBtn = $("#subscribeSubmitBtn");

        const openPopup = () => {
            $subscribeOverlay.addClass("active").attr("aria-hidden", "false");
            $nameInput.trigger("focus");
            SoundEngine.playClick();
        };

        const closePopup = () => {
            $subscribeOverlay.removeClass("active").attr("aria-hidden", "true");
            $openBtn.trigger("focus");
        };

        $openBtn.on("click", openPopup);
        $closeBtn.on("click", closePopup);

        $subscribeOverlay.on("click", function (e) {
            if (e.target === this) closePopup();
        });

        $(document).on("keydown", function (e) {
            if (e.key === "Escape" && $subscribeOverlay.hasClass("active")) {
                closePopup();
            }
        });

        $subForm.on("submit", function (e) {
            e.preventDefault();
            $msgEl.text("");

            let valid = true;
            const nameVal = ($nameInput.val() || "").trim();
            const emailVal = ($emailInput.val() || "").trim();
            const phoneVal = ($phoneInput.val() || "").trim();
            const passVal = $passInput.val() || "";

            if (!ValidationRules.isRequired(nameVal)) {
                ValidationRules.setFieldState($nameInput, "Subscriber name is required.");
                valid = false;
            } else {
                ValidationRules.setFieldState($nameInput, "");
            }

            if (!ValidationRules.isRequired(emailVal)) {
                ValidationRules.setFieldState($emailInput, "Email address is required.");
                valid = false;
            } else if (!ValidationRules.isValidEmail(emailVal)) {
                ValidationRules.setFieldState($emailInput, "Please enter a valid email (e.g. player@domain.com).");
                valid = false;
            } else {
                ValidationRules.setFieldState($emailInput, "");
            }

            if (!ValidationRules.isRequired(phoneVal)) {
                ValidationRules.setFieldState($phoneInput, "Phone number is required.");
                valid = false;
            } else if (!ValidationRules.isValidPhone(phoneVal)) {
                ValidationRules.setFieldState($phoneInput, "Enter a valid phone number (10–15 digits, e.g. +7 777 123 4567).");
                valid = false;
            } else {
                ValidationRules.setFieldState($phoneInput, "");
            }

            const pwdCheck = ValidationRules.validatePasswordComplexity(passVal);
            if (!ValidationRules.isRequired(passVal)) {
                ValidationRules.setFieldState($passInput, "Access passcode is required.");
                valid = false;
            } else if (!pwdCheck.valid) {
                ValidationRules.setFieldState($passInput, pwdCheck.message);
                valid = false;
            } else {
                ValidationRules.setFieldState($passInput, "");
            }

            if (!valid) {
                showToast("Please fix the highlighted errors in the subscription form.", "warning", "⚠️");
                return;
            }

            const origText = $subSubmitBtn.html();
            $subSubmitBtn
                .prop("disabled", true)
                .html('<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Please wait...');

            setTimeout(() => {
                $subSubmitBtn.prop("disabled", false).html(origText);
                $msgEl.text(`Thank you, ${nameVal}! Tournament alerts activated for ${emailVal}.`);
                $subForm[0].reset();
                $subForm.find(".form-control").removeClass("is-valid is-invalid");
                SoundEngine.playSuccess();
                showToast("Successfully subscribed to tournament alerts!", "success", "📬");
            }, 1000);
        });
    }

    // ======================================================================
    // 15. Requirement 5.1 & 5.2: Sign Up Wizard (contact.html)
    // ======================================================================
    function initMultiStepRegistration() {
        const $regForm = $("#registrationForm");
        if (!$regForm.length) return;

        const steps = Array.from(document.querySelectorAll(".form-step"));
        const stepIndicators = Array.from(document.querySelectorAll(".step-indicator"));
        const $progressFill = $("#formProgressFill");
        const $feedbackCard = $("#submissionFeedbackCard");
        const $formCardBody = $("#formCardBody");

        let currentStepIndex = 0;

        function goToStep(targetIndex, callback) {
            if (targetIndex < 0 || targetIndex >= steps.length) return;

            steps.forEach((step, idx) => {
                step.classList.toggle("active", idx === targetIndex);
            });

            stepIndicators.forEach((ind, idx) => {
                ind.classList.toggle("active", idx === targetIndex);
                ind.classList.toggle("completed", idx < targetIndex);
            });

            if ($progressFill.length) {
                const percent = ((targetIndex + 1) / steps.length) * 100;
                $progressFill.css("width", `${percent}%`);
            }

            currentStepIndex = targetIndex;
            if (typeof callback === "function") {
                callback(currentStepIndex, steps.length);
            }
        }

        function validateStep(index) {
            let isValid = true;

            if (index === 0) {
                const $fullName = $("#fullName");
                const $ign = $("#ign");
                const $email = $("#email");
                const $phone = $("#phone");

                const nameVal = ($fullName.val() || "").trim();
                const ignVal = ($ign.val() || "").trim();
                const emailVal = ($email.val() || "").trim();
                const phoneVal = ($phone.val() || "").trim();

                if (!ValidationRules.isRequired(nameVal) || nameVal.length < 2) {
                    ValidationRules.setFieldState($fullName, "Full Name is required (at least 2 characters).");
                    isValid = false;
                } else {
                    ValidationRules.setFieldState($fullName, "");
                }

                if (!ValidationRules.isRequired(ignVal)) {
                    ValidationRules.setFieldState($ign, "Minecraft Username (IGN) is required.");
                    isValid = false;
                } else if (!/^[a-zA-Z0-9_]{3,16}$/.test(ignVal)) {
                    ValidationRules.setFieldState($ign, "IGN must be 3–16 characters (letters, numbers, underscores).");
                    isValid = false;
                } else {
                    ValidationRules.setFieldState($ign, "");
                }

                if (!ValidationRules.isRequired(emailVal)) {
                    ValidationRules.setFieldState($email, "Email address is required.");
                    isValid = false;
                } else if (!ValidationRules.isValidEmail(emailVal)) {
                    ValidationRules.setFieldState($email, "Please enter a valid email address (e.g. name@domain.com).");
                    isValid = false;
                } else {
                    ValidationRules.setFieldState($email, "");
                }

                if (!ValidationRules.isRequired(phoneVal)) {
                    ValidationRules.setFieldState($phone, "Phone number is required.");
                    isValid = false;
                } else if (!ValidationRules.isValidPhone(phoneVal)) {
                    ValidationRules.setFieldState($phone, "Enter a valid phone number pattern (10–15 digits, e.g. +7 (777) 123-45-67).");
                    isValid = false;
                } else {
                    ValidationRules.setFieldState($phone, "");
                }
            } else if (index === 1) {
                const $discipline = $("#discipline");
                const $password = $("#password");
                const $confirmPassword = $("#confirmPassword");

                const discVal = ($discipline.val() || "").trim();
                const passVal = $password.val() || "";
                const confirmVal = $confirmPassword.val() || "";

                if (!ValidationRules.isRequired(discVal)) {
                    ValidationRules.setFieldState($discipline, "Please select your preferred PvP discipline.");
                    isValid = false;
                } else {
                    ValidationRules.setFieldState($discipline, "");
                }

                const pwdCheck = ValidationRules.validatePasswordComplexity(passVal);
                if (!ValidationRules.isRequired(passVal)) {
                    ValidationRules.setFieldState($password, "Password is required.");
                    isValid = false;
                } else if (!pwdCheck.valid) {
                    ValidationRules.setFieldState($password, pwdCheck.message);
                    isValid = false;
                } else {
                    ValidationRules.setFieldState($password, "");
                }

                if (!ValidationRules.isRequired(confirmVal)) {
                    ValidationRules.setFieldState($confirmPassword, "Please confirm your password.");
                    isValid = false;
                } else if (confirmVal !== passVal) {
                    ValidationRules.setFieldState($confirmPassword, "Passwords do not match.");
                    isValid = false;
                } else {
                    ValidationRules.setFieldState($confirmPassword, "");
                }
            } else if (index === 2) {
                const $experience = $("#experience");
                const expVal = ($experience.val() || "").trim();

                if (!ValidationRules.isRequired(expVal) || expVal.length < 5) {
                    ValidationRules.setFieldState($experience, "Please enter your Discord tag and battle experience (min 5 characters).");
                    isValid = false;
                } else {
                    ValidationRules.setFieldState($experience, "");
                }
            }

            return isValid;
        }

        $(".btn-step-next").on("click", function () {
            if (validateStep(currentStepIndex)) {
                goToStep(currentStepIndex + 1, (newStep, total) => {
                    SoundEngine.playClick();
                    showToast(`Step ${newStep} verified! Moved to Step ${newStep + 1} of ${total}.`, "info", "✓");
                });
            } else {
                SoundEngine.playClick();
                showToast("Please complete all required fields correctly before continuing.", "warning", "⚠️");
            }
        });

        $(".btn-step-prev").on("click", function () {
            goToStep(currentStepIndex - 1, () => {
                SoundEngine.playClick();
            });
        });

        $regForm.find("button[type='reset']").on("click", function () {
            $regForm.find("input, select, textarea").val("").removeClass("is-invalid is-valid");
            $regForm.find(".invalid-feedback").text("").hide();
            goToStep(0, () => {
                SoundEngine.playClick();
                showToast("Registration form fields reset.", "info", "🔄");
            });
        });

        $regForm.on("submit", function (e) {
            e.preventDefault();

            if (!validateStep(0) || !validateStep(1) || !validateStep(2)) {
                showToast("Please complete all required fields properly.", "warning", "⚠️");
                return;
            }

            const $submitBtn = $("#regSubmitBtn");
            const originalBtnHtml = $submitBtn.html();

            $submitBtn
                .prop("disabled", true)
                .html('<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving Account...');

            const ticketId = "MCT-" + Math.floor(100000 + Math.random() * 900000);
            const newUser = {
                fullName: ($("#fullName").val() || "").trim(),
                ign: ($("#ign").val() || "").trim(),
                email: ($("#email").val() || "").trim(),
                phone: ($("#phone").val() || "").trim(),
                discipline: ($("#discipline").val() || "").trim(),
                password: $("#password").val() || "",
                experience: ($("#experience").val() || "").trim(),
                ticketId: ticketId,
                registeredAt: new Date().toLocaleDateString("en-GB")
            };

            setTimeout(() => {
                saveOrUpdateUser(newUser);
                $submitBtn.prop("disabled", false).html(originalBtnHtml);

                SoundEngine.playSuccess();
                showToast("Sign Up complete! User saved in localStorage.", "success", "🏆");

                $formCardBody.hide();
                $feedbackCard.fadeIn(300);

                $("#registrationSummary").html(`
                    <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                        <span class="text-info"><strong>Ticket ID:</strong> <code id="generatedTicketCode" class="copy-snippet-code">${ticketId}</code></span>
                        <button type="button" class="btn-copy-snippet" data-copy-target="#generatedTicketCode" aria-label="Copy Ticket ID">
                            <span class="copy-icon">📋</span> <span class="copy-text">Copy ID</span>
                            <span class="copy-tooltip">Copied to clipboard!</span>
                        </button>
                    </div>
                    <p class="mb-1"><strong>Full Name:</strong> ${newUser.fullName}</p>
                    <p class="mb-1"><strong>Minecraft IGN:</strong> ${newUser.ign}</p>
                    <p class="mb-1"><strong>Email:</strong> ${newUser.email}</p>
                    <p class="mb-1"><strong>Phone:</strong> ${newUser.phone}</p>
                    <p class="mb-2"><strong>Discipline:</strong> ${newUser.discipline}</p>
                    <p class="mb-0 text-success fw-bold">✓ Stored in localStorage! Click "Open Gladiator Profile" below to view your profile page.</p>
                `);
            }, 900);
        });

        $("#registerAnotherBtn").on("click", function () {
            $regForm.find("input, select, textarea").val("").removeClass("is-invalid is-valid");
            $regForm.find(".invalid-feedback").text("").hide();
            $feedbackCard.hide();
            $formCardBody.fadeIn(250);
            goToStep(0);
            SoundEngine.playClick();
        });
    }
    initMultiStepRegistration();

    // ======================================================================
    // 16. Requirement 5.1 & 5.2: Log In Page Logic (login.html)
    // ======================================================================
    function initLoginPage() {
        const $loginForm = $("#loginForm");
        if (!$loginForm.length) return;

        const $emailInput = $("#loginEmail");
        const $phoneInput = $("#loginPhone");
        const $passInput = $("#loginPassword");
        const $alertBox = $("#loginAlertBox");

        function fillDemoCredentials() {
            $emailInput.val(DEMO_USER.email);
            $phoneInput.val(DEMO_USER.phone);
            $passInput.val(DEMO_USER.password);
            $loginForm.find(".form-control").removeClass("is-invalid").addClass("is-valid");
            $loginForm.find(".invalid-feedback").text("").hide();
            $alertBox.hide();
            SoundEngine.playClick();
            showToast("Filled Demo Champion credentials! Click Log In to continue.", "info", "⚡");
        }

        $("#fillDemoLoginBtn").on("click", fillDemoCredentials);

        $loginForm.on("submit", function (e) {
            e.preventDefault();
            $alertBox.hide();

            const emailVal = ($emailInput.val() || "").trim();
            const phoneVal = ($phoneInput.val() || "").trim();
            const passVal = $passInput.val() || "";

            let valid = true;

            if (!ValidationRules.isRequired(emailVal)) {
                ValidationRules.setFieldState($emailInput, "Email address is required.");
                valid = false;
            } else if (!ValidationRules.isValidEmail(emailVal)) {
                ValidationRules.setFieldState($emailInput, "Please enter a valid email address format.");
                valid = false;
            } else {
                ValidationRules.setFieldState($emailInput, "");
            }

            if (!ValidationRules.isRequired(phoneVal)) {
                ValidationRules.setFieldState($phoneInput, "Registered phone number is required.");
                valid = false;
            } else if (!ValidationRules.isValidPhone(phoneVal)) {
                ValidationRules.setFieldState($phoneInput, "Enter a valid phone number (10–15 digits, e.g. +7 (777) 123-45-67).");
                valid = false;
            } else {
                ValidationRules.setFieldState($phoneInput, "");
            }

            const pwdCheck = ValidationRules.validatePasswordComplexity(passVal);
            if (!ValidationRules.isRequired(passVal)) {
                ValidationRules.setFieldState($passInput, "Password is required.");
                valid = false;
            } else if (!pwdCheck.valid) {
                ValidationRules.setFieldState($passInput, pwdCheck.message);
                valid = false;
            } else {
                ValidationRules.setFieldState($passInput, "");
            }

            if (!valid) {
                SoundEngine.playClick();
                showToast("Please fix the validation errors on the Log In form.", "warning", "⚠️");
                return;
            }

            const users = getRegisteredUsers();
            const matchedUser = users.find(
                u => u.email.toLowerCase() === emailVal.toLowerCase() && u.password === passVal
            );

            if (!matchedUser) {
                $alertBox
                    .html(`<strong>Invalid Credentials:</strong> No matching account found for <code>${emailVal}</code> with that password. Sign Up first or click <strong>Auto-Fill Demo</strong>.`)
                    .fadeIn(200);
                SoundEngine.playClick();
                showToast("Invalid email or password.", "warning", "🔒");
                return;
            }

            // Update phone if changed and store active user session
            matchedUser.phone = phoneVal;
            saveOrUpdateUser(matchedUser);

            const $btn = $("#loginSubmitBtn");
            $btn.prop("disabled", true).html('<span class="spinner-border spinner-border-sm me-2"></span>Redirecting to Profile...');

            SoundEngine.playSuccess();
            showToast(`Welcome back, ${matchedUser.ign}! Redirecting to Profile...`, "success", "🔓");

            setTimeout(() => {
                window.location.href = "profile.html";
            }, 850);
        });
    }
    initLoginPage();

    // ======================================================================
    // 17. Requirement 5.1, 5.2, 5.3 & 7: Profile Page Logic (profile.html)
    // ======================================================================
    function initProfilePage() {
        const $profileForm = $("#profileUpdateForm");
        if (!$profileForm.length) return;

        let activeUser = getCurrentUser();
        if (!activeUser) {
            window.location.href = "login.html";
            return;
        }
        $("#profileStatusBadge").text("Authenticated LocalStorage Session");

        function renderProfileDetails(user) {
            $("#profileDisplayName").text(user.fullName || "Gladiator");
            $("#profileDisplayIgn").text(`IGN: ${user.ign || "marble"}`);
            $("#profileTicketId").text(user.ticketId || "MCT-202601");

            $("#profileValName").text(user.fullName || "—");
            $("#profileValIgn").text(user.ign || "—");
            $("#profileValEmail").text(user.email || "—");
            $("#profileValPhone").text(user.phone || "—");
            $("#profileValDiscipline").text(user.discipline || "Sword");
            $("#profileValExperience").text(user.experience || "—");

            $("#editFullName").val(user.fullName || "");
            $("#editIgn").val(user.ign || "");
            $("#editEmail").val(user.email || "");
            $("#editPhone").val(user.phone || "");
            $("#editDiscipline").val(user.discipline || "Sword");
            $("#editPassword").val(user.password || "");
            $("#editExperience").val(user.experience || "");

            $("#mcApiIgnInput").val(user.ign || "Notch");
        }

        function renderSavedItemsOnProfile() {
            const savedMatchIds = getSavedMatchIds();
            const savedPlayers = getSavedPlayerNames();

            const $matchesList = $("#profileSavedMatchesList");
            const $playersList = $("#profileSavedPlayersList");

            if (!savedMatchIds.length) {
                $matchesList.html('<p class="small text-muted mb-0">No bookmarked matches yet. Visit the <a href="index.html" class="text-info">Home page</a> to save matches.</p>');
            } else {
                const itemsHtml = savedMatchIds.map(id => {
                    const m = MATCHES_CATALOG.find(item => item.id === Number(id));
                    if (!m) return "";
                    return `
                        <div class="saved-item-pill">
                            <div>
                                <span class="badge bg-primary me-2">${m.discipline}</span>
                                <strong>${m.title}</strong>
                                <small class="text-muted ms-2">(${m.date})</small>
                            </div>
                            <button type="button" class="btn btn-sm btn-outline-danger btn-remove-saved-match" data-id="${m.id}">Remove</button>
                        </div>
                    `;
                }).join("");
                $matchesList.html(itemsHtml);
            }

            if (!savedPlayers.length) {
                $playersList.html('<p class="small text-muted mb-0">No watched contenders yet. Visit the <a href="leaderboard.html" class="text-info">Leaderboard</a> to watch players.</p>');
            } else {
                const pHtml = savedPlayers.map(name => {
                    const p = LEADERBOARD_PLAYERS.find(item => item.name === name) || { name, tier: "HT1", discipline: "Sword", country: "Global" };
                    return `
                        <div class="saved-item-pill">
                            <div>
                                <span class="tier-badge tier-ht1 me-2">${p.tier}</span>
                                <strong>${p.name}</strong>
                                <small class="text-muted ms-2">${p.discipline} • ${p.country}</small>
                            </div>
                            <button type="button" class="btn btn-sm btn-outline-danger btn-remove-saved-player" data-name="${p.name}">Remove</button>
                        </div>
                    `;
                }).join("");
                $playersList.html(pHtml);
            }
        }

        renderProfileDetails(activeUser);
        renderSavedItemsOnProfile();
        fetchMinecraftProfileApi(activeUser.ign || "Notch");

        $("#fetchMcProfileBtn").on("click", function () {
            SoundEngine.playClick();
            fetchMinecraftProfileApi($("#mcApiIgnInput").val());
        });

        $(document).on("click", ".btn-remove-saved-match", function () {
            const id = parseInt($(this).attr("data-id"), 10);
            toggleSavedMatch(id);
            renderSavedItemsOnProfile();
            SoundEngine.playClick();
            showToast("Removed match from saved list.", "info", "🗑️");
        });

        $(document).on("click", ".btn-remove-saved-player", function () {
            const name = $(this).attr("data-name");
            toggleSavedPlayer(name);
            renderSavedItemsOnProfile();
            SoundEngine.playClick();
            showToast(`Removed ${name} from watchlist.`, "info", "🗑️");
        });

        $("#clearAllSavedBtn").on("click", function () {
            safeSetJSON("mctiers_saved_matches", []);
            safeSetJSON("mctiers_saved_players", []);
            renderSavedItemsOnProfile();
            SoundEngine.playClick();
            showToast("Cleared all saved matches and watched contenders.", "info", "🧹");
        });

        $("#logoutBtn").on("click", function () {
            safeRemoveStorage("mctiers_current_user");
            SoundEngine.playSwitch();
            showToast("Logged out successfully. Redirecting to Log In...", "info", "🚪");
            setTimeout(() => {
                window.location.href = "login.html";
            }, 700);
        });

        $profileForm.on("submit", function (e) {
            e.preventDefault();

            const $name = $("#editFullName");
            const $ign = $("#editIgn");
            const $email = $("#editEmail");
            const $phone = $("#editPhone");
            const $disc = $("#editDiscipline");
            const $pass = $("#editPassword");
            const $exp = $("#editExperience");

            let valid = true;

            if (!ValidationRules.isRequired($name.val()) || $name.val().trim().length < 2) {
                ValidationRules.setFieldState($name, "Full name is required (min 2 characters).");
                valid = false;
            } else {
                ValidationRules.setFieldState($name, "");
            }

            if (!ValidationRules.isRequired($ign.val()) || !/^[a-zA-Z0-9_]{3,16}$/.test($ign.val().trim())) {
                ValidationRules.setFieldState($ign, "Valid Minecraft IGN (3–16 alphanumeric/underscore chars) is required.");
                valid = false;
            } else {
                ValidationRules.setFieldState($ign, "");
            }

            if (!ValidationRules.isRequired($email.val()) || !ValidationRules.isValidEmail($email.val())) {
                ValidationRules.setFieldState($email, "Please enter a valid email address.");
                valid = false;
            } else {
                ValidationRules.setFieldState($email, "");
            }

            if (!ValidationRules.isRequired($phone.val()) || !ValidationRules.isValidPhone($phone.val())) {
                ValidationRules.setFieldState($phone, "Please enter a valid phone number (10–15 digits).");
                valid = false;
            } else {
                ValidationRules.setFieldState($phone, "");
            }

            if (!ValidationRules.isRequired($disc.val())) {
                ValidationRules.setFieldState($disc, "Please select a primary PvP discipline.");
                valid = false;
            } else {
                ValidationRules.setFieldState($disc, "");
            }

            const pwdCheck = ValidationRules.validatePasswordComplexity($pass.val());
            if (!ValidationRules.isRequired($pass.val()) || !pwdCheck.valid) {
                ValidationRules.setFieldState($pass, pwdCheck.message || "Password is required.");
                valid = false;
            } else {
                ValidationRules.setFieldState($pass, "");
            }

            if (!ValidationRules.isRequired($exp.val())) {
                ValidationRules.setFieldState($exp, "Discord tag & tournament notes are required.");
                valid = false;
            } else {
                ValidationRules.setFieldState($exp, "");
            }

            if (!valid) {
                SoundEngine.playClick();
                showToast("Please fix the validation errors before saving your profile.", "warning", "⚠️");
                return;
            }

            activeUser = Object.assign({}, activeUser, {
                fullName: $name.val().trim(),
                ign: $ign.val().trim(),
                email: $email.val().trim(),
                phone: $phone.val().trim(),
                discipline: $disc.val().trim(),
                password: $pass.val(),
                experience: $exp.val().trim()
            });

            saveOrUpdateUser(activeUser);
            renderProfileDetails(activeUser);
            fetchMinecraftProfileApi(activeUser.ign);
            SoundEngine.playSuccess();
            showToast("Profile updated and saved to localStorage!", "success", "💾");
        });
    }
    initProfilePage();

    // ======================================================================
    // 18. Live Clock
    // ======================================================================
    function updateClock() {
        const $clockEl = $("#currentDateTime");
        if ($clockEl.length) {
            const now = new Date();
            $clockEl.text(
                now.toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                })
            );
        }
    }
    updateClock();
    setInterval(updateClock, 1000);
});
