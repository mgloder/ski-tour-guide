/*!
 * Brutalix — behaviour
 * https://brutalix.ayazpoor.fr — part of the Ayazpoor ecosystem
 *
 * Copyright (c) 2026 Olivier AYAZPOOR
 * olivier@ayazpoor.fr · @Ohw2222 (GitHub) · @olivpics (Instagram)
 *
 * Dual-licensed under Apache-2.0 or MIT, at your option.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 *
 * ---------------------------------------------------------------------------
 * No dependencies. Nothing here is needed for the framework to look right —
 * every component is styled by CSS alone. This adds only what genuinely needs
 * a script: something to open, something to close, and the three switches that
 * change the whole page (theme, corners, typeface).
 *
 *   markup   <button data-bx-toggle="modal" data-bx-target="#hello">
 *   script   Brutalix.modal.open('#hello')
 *
 * Wired from data-bx-* attributes on load, and again whenever the DOM changes.
 * ---------------------------------------------------------------------------
 */

(function (window, document) {
    'use strict';

    var VERSION = '1.0.0';
    var KEY = 'brutalix:';

    /* ---------------------------------------------------------------- tools */

    function $(sel, scope) { return (scope || document).querySelector(sel); }
    function $$(sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); }
    function on(el, type, fn, opts) { if (el) el.addEventListener(type, fn, opts || false); }

    function targetOf(el) {
        var sel = el.getAttribute('data-bx-target') || el.getAttribute('href');
        if (!sel || sel.charAt(0) !== '#') return null;
        try { return $(sel); } catch (e) { return null; }
    }

    function emit(el, name, detail) {
        if (!el) return true;
        return el.dispatchEvent(new CustomEvent('bx:' + name, {
            bubbles: true, cancelable: true, detail: detail || {}
        }));
    }

    function store(key, value) {
        try {
            if (value === undefined) return window.localStorage.getItem(KEY + key);
            if (value === null) window.localStorage.removeItem(KEY + key);
            else window.localStorage.setItem(KEY + key, value);
        } catch (e) { /* private mode: preferences do not persist, and that is all */ }
        return value;
    }

    /* ----------------------------------------------------------------- skin
       Three independent switches, all attributes on <html>:
         data-theme    which of the nine families, light or dark
         data-corners  square | rounded | soft
         data-font     grotesk | mono | display | system                      */

    /* Each family is a light member and its dark pair. The default family is
       the bare :root plus [data-theme="dark"], so '' is a real value here. */
    var FAMILIES = [
        { id: 'default',  label: 'Default',  light: 'light',    dark: 'dark' },
        { id: 'acid',     label: 'Acid',     light: 'acid',     dark: 'acid-dark' },
        { id: 'flare',    label: 'Flare',    light: 'flare',    dark: 'flare-dark' },
        { id: 'blood',    label: 'Blood',    light: 'blood',    dark: 'blood-dark' },
        { id: 'bubble',   label: 'Bubble',   light: 'bubble',   dark: 'bubble-dark' },
        { id: 'cyber',    label: 'Cyber',    light: 'cyber',    dark: 'cyber-dark' },
        { id: 'violet',   label: 'Violet',   light: 'violet',   dark: 'violet-dark' },
        { id: 'concrete', label: 'Concrete', light: 'concrete', dark: 'concrete-dark' },
        { id: 'xerox',    label: 'Xerox',    light: 'xerox',    dark: 'xerox-dark' }
    ];

    var CORNERS = ['square', 'rounded', 'soft', 'circular'];
    var FONTS = ['grotesk', 'mono', 'display', 'system'];

    var root = document.documentElement;

    var skin = {
        families: FAMILIES,

        /** The raw data-theme value, '' meaning the default family. */
        theme: function () { return root.getAttribute('data-theme') || ''; },

        /** Which family is showing, and whether it is on its dark member. */
        family: function () {
            var now = this.theme();
            for (var i = 0; i < FAMILIES.length; i++) {
                if (FAMILIES[i].light === now || FAMILIES[i].dark === now) return FAMILIES[i];
            }
            return FAMILIES[0];
        },

        isDark: function () {
            var now = this.theme();
            if (now) return now === 'dark' || now.slice(-5) === '-dark';
            /* nothing chosen at all: the stylesheet is following the system */
            return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
        },

        /** Apply a theme by its raw name; '' clears back to the default family. */
        setTheme: function (name) {
            if (name) root.setAttribute('data-theme', name);
            else root.removeAttribute('data-theme');
            store('theme', name || '');
            emit(root, 'theme', { theme: name || '' });
            this.paintMenus();
            return name || '';
        },

        /** Switch family, keeping light or dark as it is. */
        setFamily: function (id) {
            var dark = this.isDark();
            for (var i = 0; i < FAMILIES.length; i++) {
                if (FAMILIES[i].id === id) return this.setTheme(dark ? FAMILIES[i].dark : FAMILIES[i].light);
            }
            return this.theme();
        },

        /** Switch light or dark, keeping the family as it is. */
        setMode: function (mode) {
            var fam = this.family();
            return this.setTheme(mode === 'dark' ? fam.dark : fam.light);
        },

        toggleMode: function () { return this.setMode(this.isDark() ? 'light' : 'dark'); },

        corners: function (value) {
            if (value === undefined) return root.getAttribute('data-corners') || 'square';
            if (CORNERS.indexOf(value) < 0) return this.corners();
            root.setAttribute('data-corners', value);
            store('corners', value);
            emit(root, 'corners', { corners: value });
            this.paintMenus();
            return value;
        },

        font: function (value) {
            if (value === undefined) return root.getAttribute('data-font') || 'grotesk';
            if (FONTS.indexOf(value) < 0) return this.font();
            root.setAttribute('data-font', value);
            store('font', value);
            emit(root, 'font', { font: value });
            this.paintMenus();
            return value;
        },

        /**
         * Fills every [data-bx-skin-menu] with the pickers, so a page only has
         * to leave an empty element where the controls should appear.
         */
        paintMenus: function () {
            $$('[data-bx-skin-menu]').forEach(function (box) {
                if (box.getAttribute('data-bx-built') !== '1') build(box);
                sync(box);
            });

            function build(box) {
                box.setAttribute('data-bx-built', '1');
                box.innerHTML = '';

                /* isFr() reads <html lang>, which the server set. The drawer is
                   the one part of the page built in script rather than in PHP,
                   so it has to ask the document what language it is in — and
                   asking the document means it can never disagree with the
                   prose around it. The theme names themselves are proper nouns
                   and stay as they are in both languages. */
                box.appendChild(group(isFr() ? 'Thème' : 'Theme', FAMILIES.map(function (f) {
                    return { value: f.id, label: f.label, kind: 'family' };
                })));
                box.appendChild(group(isFr() ? 'Mode' : 'Mode', [
                    { value: 'light', label: isFr() ? 'Clair' : 'Light', kind: 'mode' },
                    { value: 'dark', label: isFr() ? 'Sombre' : 'Dark', kind: 'mode' }
                ]));
                box.appendChild(group(isFr() ? 'Angles' : 'Corners', CORNERS.map(function (c) {
                    return { value: c, label: c, kind: 'corners' };
                })));
                box.appendChild(group(isFr() ? 'Typographie' : 'Type', FONTS.map(function (f) {
                    return { value: f, label: f, kind: 'font' };
                })));
            }

            function group(title, items) {
                var wrap = document.createElement('div');
                wrap.className = 'bx-skin-group';

                var head = document.createElement('p');
                head.className = 'bx-skin-title';
                head.textContent = title;
                wrap.appendChild(head);

                var list = document.createElement('div');
                list.className = 'bx-skin-options';
                items.forEach(function (item) {
                    var b = document.createElement('button');
                    b.type = 'button';
                    b.className = 'bx-skin-option';
                    b.textContent = item.label;
                    b.setAttribute('data-bx-kind', item.kind);
                    b.setAttribute('data-bx-value', item.value);
                    on(b, 'click', function () {
                        if (item.kind === 'family') skin.setFamily(item.value);
                        else if (item.kind === 'mode') skin.setMode(item.value);
                        else if (item.kind === 'corners') skin.corners(item.value);
                        else skin.font(item.value);
                    });
                    list.appendChild(b);
                });
                wrap.appendChild(list);
                return wrap;
            }

            function sync(box) {
                var fam = skin.family().id;
                var mode = skin.isDark() ? 'dark' : 'light';
                var corners = skin.corners();
                var font = skin.font();
                $$('.bx-skin-option', box).forEach(function (b) {
                    var kind = b.getAttribute('data-bx-kind');
                    var value = b.getAttribute('data-bx-value');
                    var live = kind === 'family' ? fam
                             : kind === 'mode' ? mode
                             : kind === 'corners' ? corners : font;
                    b.classList.toggle('bx-active', value === live);
                    b.setAttribute('aria-pressed', value === live ? 'true' : 'false');
                });
            }
        }
    };

    /* ------------------------------------------------------------- backdrop */

    var backdrop = {
        node: null,
        users: 0,
        show: function (onClick) {
            if (!this.node) {
                this.node = document.createElement('div');
                this.node.className = 'bx-backdrop';
                document.body.appendChild(this.node);
            }
            this.node.onclick = function () { if (onClick) onClick(); };
            var n = this.node;
            requestAnimationFrame(function () { n.classList.add('bx-open'); });
            this.users++;
            document.body.style.overflow = 'hidden';
        },
        hide: function () {
            this.users = Math.max(0, this.users - 1);
            if (this.users === 0) {
                if (this.node) this.node.classList.remove('bx-open');
                document.body.style.overflow = '';
            }
        }
    };

    /* ---------------------------------------------------------------- modal */

    var openModals = [];

    var modal = {
        open: function (t) {
            var node = typeof t === 'string' ? $(t) : t;
            if (!node || !emit(node, 'modal:show')) return null;
            node.classList.add('bx-open');
            node.setAttribute('aria-hidden', 'false');
            openModals.push(node);
            backdrop.show(function () {
                if (node.getAttribute('data-bx-static') === null) modal.close(node);
            });
            node._bxReturn = document.activeElement;
            var first = node.querySelector('[autofocus]') ||
                        node.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (first) first.focus();
            emit(node, 'modal:shown');
            return node;
        },
        close: function (t) {
            var node = typeof t === 'string' ? $(t) : t;
            if (!node) node = openModals[openModals.length - 1];
            if (!node || !emit(node, 'modal:hide')) return null;
            node.classList.remove('bx-open');
            node.setAttribute('aria-hidden', 'true');
            openModals = openModals.filter(function (m) { return m !== node; });
            backdrop.hide();
            if (node._bxReturn && node._bxReturn.focus) node._bxReturn.focus();
            emit(node, 'modal:hidden');
            return node;
        },
        closeAll: function () { openModals.slice().forEach(function (m) { modal.close(m); }); }
    };

    /* --------------------------------------------------------------- drawer */

    var openDrawers = [];

    var drawer = {
        open: function (t) {
            var node = typeof t === 'string' ? $(t) : t;
            if (!node || !emit(node, 'drawer:show')) return null;
            node.classList.add('bx-open');
            node.setAttribute('aria-hidden', 'false');
            openDrawers.push(node);
            backdrop.show(function () { drawer.close(node); });
            emit(node, 'drawer:shown');
            return node;
        },
        close: function (t) {
            var node = typeof t === 'string' ? $(t) : t;
            if (!node) node = openDrawers[openDrawers.length - 1];
            if (!node || !emit(node, 'drawer:hide')) return null;
            node.classList.remove('bx-open');
            node.setAttribute('aria-hidden', 'true');
            openDrawers = openDrawers.filter(function (d) { return d !== node; });
            backdrop.hide();
            emit(node, 'drawer:hidden');
            return node;
        }
    };

    /* ------------------------------------------------------------- dropdown */

    var dropdown = {
        toggle: function (trigger) {
            var parent = trigger.closest ? trigger.closest('.bx-dropdown') : null;
            if (!parent) return;
            if (parent.classList.contains('bx-open')) dropdown.close(parent);
            else { dropdown.closeAll(parent); dropdown.open(parent, trigger); }
        },
        open: function (parent, trigger) {
            parent.classList.add('bx-open');
            if (trigger) trigger.setAttribute('aria-expanded', 'true');
        },
        close: function (parent) {
            parent.classList.remove('bx-open');
            var t = $('[data-bx-toggle="dropdown"]', parent);
            if (t) t.setAttribute('aria-expanded', 'false');
        },
        closeAll: function (except) {
            $$('.bx-dropdown.bx-open').forEach(function (p) { if (p !== except) dropdown.close(p); });
        }
    };

    /* ------------------------------------------------------------------ tab */

    var tab = {
        show: function (trigger) {
            var node = typeof trigger === 'string' ? $(trigger) : trigger;
            if (!node) return null;
            var pane = targetOf(node);
            if (!pane || !emit(node, 'tab:show', { pane: pane })) return null;

            var strip = node.closest ? node.closest('.bx-tabs') : null;
            if (strip) {
                $$('.bx-tab', strip).forEach(function (t) {
                    t.classList.remove('bx-active');
                    t.setAttribute('aria-selected', 'false');
                });
            }
            node.classList.add('bx-active');
            node.setAttribute('aria-selected', 'true');

            if (pane.parentElement) {
                $$('.bx-tab-pane', pane.parentElement).forEach(function (p) { p.classList.remove('bx-active'); });
            }
            pane.classList.add('bx-active');
            emit(node, 'tab:shown', { pane: pane });
            return pane;
        }
    };

    /* ------------------------------------------------------------- collapse */

    var collapse = {
        show: function (node) {
            if (!node || !emit(node, 'collapse:show')) return;
            node.classList.add('bx-open');
            mark(node, true);
        },
        hide: function (node) {
            if (!node || !emit(node, 'collapse:hide')) return;
            node.classList.remove('bx-open');
            mark(node, false);
        },
        toggle: function (node) {
            if (!node) return;
            if (node.classList.contains('bx-open')) { collapse.hide(node); return; }
            var group = node.closest ? node.closest('[data-bx-accordion="one"]') : null;
            if (group) {
                $$('.bx-collapse.bx-open', group).forEach(function (o) { if (o !== node) collapse.hide(o); });
            }
            collapse.show(node);
        }
    };

    function mark(node, open) {
        if (!node.id) return;
        $$('[data-bx-target="#' + node.id + '"], [href="#' + node.id + '"]').forEach(function (t) {
            t.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
    }

    /* ---------------------------------------------------------------- toast */

    var toast = {
        show: function (message, options) {
            options = options || {};
            var place = options.position || 'tr';
            var box = $('.bx-toasts.bx-toasts-' + place);
            if (!box) {
                box = document.createElement('div');
                box.className = 'bx-toasts bx-toasts-' + place;
                box.setAttribute('role', 'status');
                box.setAttribute('aria-live', 'polite');
                document.body.appendChild(box);
            }

            var node = document.createElement('div');
            node.className = 'bx-toast' + (options.variant ? ' bx-toast-' + options.variant : '');
            node.setAttribute('role', 'alert');

            var body = document.createElement('div');
            body.className = 'bx-toast-body';
            if (options.title) {
                var t = document.createElement('span');
                t.className = 'bx-toast-title';
                t.textContent = options.title;
                body.appendChild(t);
            }
            var text = document.createElement('span');
            text.textContent = message == null ? '' : String(message);
            body.appendChild(text);
            node.appendChild(body);

            var close = document.createElement('button');
            close.type = 'button';
            close.className = 'bx-close';
            close.setAttribute('aria-label', isFr() ? 'Fermer' : 'Close');
            node.appendChild(close);

            box.appendChild(node);
            requestAnimationFrame(function () { node.classList.add('bx-open'); });

            function dismiss() {
                node.classList.remove('bx-open');
                window.setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 250);
            }
            on(close, 'click', dismiss);

            var timeout = options.timeout === undefined ? 5000 : options.timeout;
            if (timeout) window.setTimeout(dismiss, timeout);
            return { node: node, dismiss: dismiss };
        }
    };

    /* -------------------------------------------------------------- popover */

    var popover = {
        toggle: function (trigger) {
            var node = targetOf(trigger);
            if (!node) return;
            var showing = node.classList.contains('bx-open');
            popover.closeAll();
            if (showing) return;
            var box = trigger.getBoundingClientRect();
            node.style.position = 'absolute';
            node.style.top = (box.bottom + window.scrollY + 10) + 'px';
            node.style.left = (box.left + window.scrollX) + 'px';
            node.classList.add('bx-open');
            trigger.setAttribute('aria-expanded', 'true');
        },
        closeAll: function () {
            $$('.bx-popover.bx-open').forEach(function (p) { p.classList.remove('bx-open'); });
            $$('[data-bx-toggle="popover"][aria-expanded="true"]').forEach(function (t) {
                t.setAttribute('aria-expanded', 'false');
            });
        }
    };

    /* ------------------------------------------------------------ scrollspy */

    /** The nearest ancestor that actually scrolls, or null. */
    function scrollParent(node) {
        var box = node.parentElement;
        while (box && box !== document.body && box !== document.documentElement) {
            var flow = window.getComputedStyle(box).overflowY;
            if ((flow === 'auto' || flow === 'scroll') && box.scrollHeight > box.clientHeight + 1) return box;
            box = box.parentElement;
        }
        return null;
    }

    /**
     * Brings the active link into view inside its own scrolling box, and moves
     * nothing else. `scrollIntoView` would scroll the page as well, which is
     * exactly what a table of contents must not do while you are reading.
     */
    function keepInView(link) {
        var box = scrollParent(link);
        if (!box) return;
        var area = box.getBoundingClientRect();
        var item = link.getBoundingClientRect();
        var margin = 16;
        var move = 0;
        if (item.top < area.top + margin) move = item.top - area.top - margin;
        else if (item.bottom > area.bottom - margin) move = item.bottom - area.bottom + margin;
        if (!move) return;
        var smooth = !window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (box.scrollTo) box.scrollTo({ top: box.scrollTop + move, behavior: smooth ? 'smooth' : 'auto' });
        else box.scrollTop += move;
    }

    function Scrollspy(container) {
        var nav = $(container.getAttribute('data-bx-scrollspy') || '');
        if (!nav || !('IntersectionObserver' in window)) return null;

        var links = $$('a[href^="#"]', nav);
        var sections = links.map(function (l) {
            try { return $(l.getAttribute('href')); } catch (e) { return null; }
        });

        var busy = false;
        on(nav, 'pointerenter', function () { busy = true; });
        on(nav, 'pointerleave', function () { busy = false; });

        var current = null;
        var seen = [];

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                var at = seen.indexOf(e.target);
                if (e.isIntersecting && at < 0) seen.push(e.target);
                if (!e.isIntersecting && at >= 0) seen.splice(at, 1);
            });
            if (!seen.length) return;
            var top = seen.slice().sort(function (a, b) {
                return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
            })[0];
            if (top === current) return;
            current = top;
            var chosen = null;
            links.forEach(function (l, i) {
                var on = sections[i] === top;
                l.classList.toggle('bx-active', on);
                if (on) chosen = l;
            });
            if (chosen && !busy) keepInView(chosen);
        }, { rootMargin: '-96px 0px -70% 0px', threshold: 0 });

        sections.forEach(function (s) { if (s) observer.observe(s); });
        return { destroy: function () { observer.disconnect(); } };
    }

    /* --------------------------------------------------------------- wiring */


    /* =====================================================================
       COMBOBOX / AUTOCOMPLETE
       ===================================================================== */

    function Combobox(node) {
        var input = $('input', node);
        var list = $('.bx-combobox-list', node);
        if (!input || !list) return null;

        var multiple = node.hasAttribute('data-bx-multiple');
        var source = [];
        try { source = JSON.parse(node.getAttribute('data-bx-options') || '[]'); }
        catch (e) { source = []; }
        if (!source.length) {
            source = $$('.bx-combobox-option', list).map(function (el) {
                return { value: el.getAttribute('data-bx-value') || el.textContent.trim(), label: el.textContent.trim() };
            });
        }

        var chosen = [];
        var active = -1;
        var tokens = $('.bx-combobox-tokens', node);

        function fold(s) {
            s = String(s).toLowerCase();
            if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
            return s;
        }

        function draw() {
            var needle = fold(input.value.trim());
            var hits = source.filter(function (o) {
                return !needle || fold(o.label).indexOf(needle) >= 0;
            });
            list.innerHTML = '';
            active = -1;

            if (!hits.length) {
                var empty = document.createElement('p');
                empty.className = 'bx-combobox-empty';
                empty.textContent = node.getAttribute('data-bx-empty')
                    || (isFr() ? 'Aucun résultat' : 'No match');
                list.appendChild(empty);
                return;
            }

            hits.forEach(function (o) {
                var item = document.createElement('div');
                item.className = 'bx-combobox-option';
                item.setAttribute('role', 'option');
                item.setAttribute('data-bx-value', o.value);
                item.setAttribute('aria-selected', chosen.indexOf(o.value) >= 0 ? 'true' : 'false');
                item.textContent = o.label;
                on(item, 'mousedown', function (e) { e.preventDefault(); pick(o); });
                list.appendChild(item);
            });
        }

        function options() { return $$('.bx-combobox-option', list); }

        function highlight(next) {
            var all = options();
            if (!all.length) return;
            active = (next + all.length) % all.length;
            all.forEach(function (el, i) { el.classList.toggle('bx-active', i === active); });
            all[active].scrollIntoView({ block: 'nearest' });
        }

        function pick(o) {
            if (multiple) {
                if (chosen.indexOf(o.value) < 0) chosen.push(o.value);
                input.value = '';
                paintTokens();
                draw();
            } else {
                chosen = [o.value];
                input.value = o.label;
                node.classList.remove('bx-open');
            }
            emit(node, 'combobox:change', { value: multiple ? chosen.slice() : o.value });
        }

        function paintTokens() {
            if (!tokens) return;
            tokens.innerHTML = '';
            chosen.forEach(function (value) {
                var found = source.filter(function (o) { return o.value === value; })[0];
                var tag = document.createElement('span');
                tag.className = 'bx-tag fx-tag-primary';
                tag.textContent = found ? found.label : value;
                var kill = document.createElement('button');
                kill.type = 'button';
                kill.className = 'bx-chip-remove';
                kill.setAttribute('aria-label', isFr() ? 'Retirer' : 'Remove');
                kill.innerHTML = '<i class="ay ay-x" aria-hidden="true"></i>';
                on(kill, 'click', function () {
                    chosen = chosen.filter(function (v) { return v !== value; });
                    paintTokens();
                    draw();
                    emit(node, 'combobox:change', { value: chosen.slice() });
                });
                tag.appendChild(kill);
                tokens.appendChild(tag);
            });
        }

        on(input, 'focus', function () { node.classList.add('bx-open'); draw(); });
        on(input, 'input', function () { node.classList.add('bx-open'); draw(); });
        on(input, 'blur', function () { setTimeout(function () { node.classList.remove('bx-open'); }, 120); });
        on(input, 'keydown', function (event) {
            if (event.key === 'ArrowDown') { event.preventDefault(); node.classList.add('bx-open'); highlight(active + 1); }
            else if (event.key === 'ArrowUp') { event.preventDefault(); highlight(active - 1); }
            else if (event.key === 'Enter') {
                var all = options();
                if (all[active]) {
                    event.preventDefault();
                    var value = all[active].getAttribute('data-bx-value');
                    pick(source.filter(function (o) { return o.value === value; })[0] || { value: value, label: value });
                }
            } else if (event.key === 'Escape') { node.classList.remove('bx-open'); }
            else if (event.key === 'Backspace' && multiple && !input.value && chosen.length) {
                chosen.pop(); paintTokens(); emit(node, 'combobox:change', { value: chosen.slice() });
            }
        });

        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-expanded', 'false');
        input.setAttribute('aria-autocomplete', 'list');
        list.setAttribute('role', 'listbox');

        return {
            value: function () { return multiple ? chosen.slice() : chosen[0]; },
            set: function (v) { chosen = [].concat(v); paintTokens(); draw(); },
            options: function (list) { source = list; draw(); }
        };
    }

    /* =====================================================================
       CALENDAR AND DATE PICKER
       ---------------------------------------------------------------------
       All month arithmetic is done on local Date objects and never on UTC:
       a date picker that shifts by a day across a timezone is the classic
       failure, and it comes entirely from mixing the two.
       ===================================================================== */

    var MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];
    var MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                     'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    var DOW_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var DOW_FR = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

    function isFr() { return root.lang === 'fr'; }
    function monthName(i) { return (isFr() ? MONTHS_FR : MONTHS_EN)[i]; }
    function dayNames() { return isFr() ? DOW_FR : DOW_EN; }

    function ymd(date) {
        return date.getFullYear() + '-' +
               String(date.getMonth() + 1).padStart(2, '0') + '-' +
               String(date.getDate()).padStart(2, '0');
    }

    function parseYmd(text) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text || '').trim());
        if (!m) return null;
        var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        return isNaN(d.getTime()) ? null : d;
    }

    /** Builds one month grid into `host`. Weeks start Monday. */
    function paintMonth(host, cursor, opts) {
        opts = opts || {};
        host.innerHTML = '';

        var head = document.createElement('div');
        head.className = 'bx-calendar-head';
        var prev = document.createElement('button');
        prev.type = 'button';
        prev.className = 'bx-btn fx-btn-ghost fx-btn-sm fx-btn-icon';
        prev.setAttribute('aria-label', isFr() ? 'Mois précédent' : 'Previous month');
        prev.innerHTML = '<i class="ay ay-chevron-down" style="transform:rotate(90deg)" aria-hidden="true"></i>';
        var title = document.createElement('span');
        title.className = 'bx-calendar-title';
        title.textContent = monthName(cursor.getMonth()) + ' ' + cursor.getFullYear();
        var next = document.createElement('button');
        next.type = 'button';
        next.className = 'bx-btn fx-btn-ghost fx-btn-sm fx-btn-icon';
        next.setAttribute('aria-label', isFr() ? 'Mois suivant' : 'Next month');
        next.innerHTML = '<i class="ay ay-chevron-down" style="transform:rotate(-90deg)" aria-hidden="true"></i>';
        head.appendChild(prev); head.appendChild(title); head.appendChild(next);
        host.appendChild(head);

        on(prev, 'click', function () { cursor.setMonth(cursor.getMonth() - 1); paintMonth(host, cursor, opts); });
        on(next, 'click', function () { cursor.setMonth(cursor.getMonth() + 1); paintMonth(host, cursor, opts); });

        var grid = document.createElement('div');
        grid.className = 'bx-calendar-grid';
        dayNames().forEach(function (d) {
            var cell = document.createElement('div');
            cell.className = 'bx-calendar-dow';
            cell.textContent = d;
            grid.appendChild(cell);
        });

        var first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        /* getDay() is Sunday-first; this rotates it to Monday-first. */
        var lead = (first.getDay() + 6) % 7;
        var start = new Date(first);
        start.setDate(first.getDate() - lead);

        var today = ymd(new Date());
        for (var i = 0; i < 42; i++) {
            var day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
            var key = ymd(day);
            var cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'bx-calendar-day';
            cell.setAttribute('data-bx-date', key);
            if (day.getMonth() !== cursor.getMonth()) cell.classList.add('bx-outside');
            if (key === today) cell.classList.add('bx-today');
            if (opts.selected === key) cell.classList.add('bx-selected');
            if (opts.min && key < opts.min) cell.disabled = true;
            if (opts.max && key > opts.max) cell.disabled = true;

            var num = document.createElement('span');
            num.className = 'bx-calendar-num';
            num.textContent = day.getDate();
            cell.appendChild(num);

            if (opts.events && opts.events[key]) {
                opts.events[key].forEach(function (ev) {
                    var tag = document.createElement('span');
                    tag.className = 'bx-calendar-event' + (ev.kind ? ' fx-calendar-event-' + ev.kind : '');
                    tag.textContent = ev.label;
                    cell.appendChild(tag);
                });
            }

            if (opts.onPick) {
                (function (k, c) { on(c, 'click', function () { opts.onPick(k, c); }); }(key, cell));
            }
            grid.appendChild(cell);

            /* Six rows is the worst case; stop early when the month is done
               and the row is complete, so February does not draw a blank week. */
            if (i >= 27 && (i + 1) % 7 === 0) {
                var after = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i + 1);
                if (after.getMonth() !== cursor.getMonth()) { host.appendChild(grid); return; }
            }
        }
        host.appendChild(grid);
    }

    function Calendar(node) {
        var cursor = parseYmd(node.getAttribute('data-bx-month')) || new Date();
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        var events = {};
        try { events = JSON.parse(node.getAttribute('data-bx-events') || '{}'); } catch (e) { events = {}; }

        function render() {
            paintMonth(node, cursor, {
                events: events,
                onPick: function (key) { emit(node, 'calendar:pick', { date: key }); }
            });
        }
        render();
        return {
            go: function (d) { cursor = new Date(d.getFullYear(), d.getMonth(), 1); render(); },

            /* Months are given the way people say them — 8 is August — because
               a caller who has to remember that August is 7 will get it wrong. */
            month: function (year, month) {
                cursor = new Date(year, month - 1, 1);
                render();
                return cursor;
            },

            events: function (map) { events = map || {}; render(); }
        };
    }

    function DatePicker(node) {
        var input = $('input', node);
        var pop = $('.bx-datepicker-pop', node);
        if (!input || !pop) return null;

        var withTime = node.hasAttribute('data-bx-time');
        var cursor = parseYmd(input.value) || new Date();
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        var host = document.createElement('div');
        host.className = 'bx-calendar';
        pop.innerHTML = '';
        pop.appendChild(host);

        var hh, mm;
        if (withTime) {
            var foot = document.createElement('div');
            foot.className = 'bx-datepicker-foot';
            var field = document.createElement('div');
            field.className = 'bx-timefield';
            hh = document.createElement('input');
            mm = document.createElement('input');
            [hh, mm].forEach(function (el, i) {
                el.type = 'number';
                el.min = 0;
                el.max = i === 0 ? 23 : 59;
                el.value = i === 0 ? '09' : '00';
                el.setAttribute('aria-label', i === 0 ? (isFr() ? 'Heures' : 'Hours') : (isFr() ? 'Minutes' : 'Minutes'));
                on(el, 'input', commit);
            });
            field.appendChild(hh);
            field.appendChild(document.createTextNode(':'));
            field.appendChild(mm);
            foot.appendChild(field);

            var done = document.createElement('button');
            done.type = 'button';
            done.className = 'bx-btn fx-btn-primary fx-btn-sm';
            done.textContent = isFr() ? 'Terminé' : 'Done';
            on(done, 'click', function () { node.classList.remove('bx-open'); });
            foot.appendChild(done);
            pop.appendChild(foot);
        }

        var picked = parseYmd(input.value) ? ymd(parseYmd(input.value)) : null;

        function commit() {
            if (!picked) return;
            var text = picked;
            if (withTime) {
                text += ' ' + String(hh.value || 0).padStart(2, '0') + ':' + String(mm.value || 0).padStart(2, '0');
            }
            input.value = text;
            emit(node, 'datepicker:change', { value: text });
        }

        function render() {
            paintMonth(host, cursor, {
                selected: picked,
                min: node.getAttribute('data-bx-min'),
                max: node.getAttribute('data-bx-max'),
                onPick: function (key) {
                    picked = key;
                    commit();
                    render();
                    if (!withTime) node.classList.remove('bx-open');
                }
            });
        }
        render();

        on(input, 'focus', function () { node.classList.add('bx-open'); });
        on(input, 'click', function () { node.classList.add('bx-open'); });
        on(input, 'change', function () {
            var d = parseYmd(input.value.slice(0, 10));
            if (d) { picked = ymd(d); cursor = new Date(d.getFullYear(), d.getMonth(), 1); render(); }
        });
        on(input, 'keydown', function (e) { if (e.key === 'Escape') node.classList.remove('bx-open'); });

        return {
            value: function () { return input.value; },

            /* Setting from script goes through the same path as typing, so a
               value set this way is bounded and rendered like any other. */
            set: function (v) {
                var d = parseYmd(String(v).slice(0, 10));
                if (!d) return null;
                picked = ymd(d);
                cursor = new Date(d.getFullYear(), d.getMonth(), 1);
                var clock = String(v).slice(11, 16);
                if (withTime && /^\d{2}:\d{2}$/.test(clock)) {
                    hh.value = clock.slice(0, 2);
                    mm.value = clock.slice(3, 5);
                }
                commit();
                render();
                return input.value;
            },

            open: function () { node.classList.add('bx-open'); },
            close: function () { node.classList.remove('bx-open'); }
        };
    }

    /* =====================================================================
       DATA TABLE — sort, filter, paginate, select
       ===================================================================== */

    function DataTable(node) {
        var table = $('table', node) || node;
        var body = $('tbody', table);
        if (!body) return null;

        var rows = $$('tr', body);
        var perPage = Number(node.getAttribute('data-bx-page-size') || 0);
        var page = 0;
        var sortIndex = -1, sortDir = 1;
        var filter = '';

        var search = $('[data-bx-table-search]', node) ||
                     (node.previousElementSibling && $('[data-bx-table-search]', node.previousElementSibling));
        var status = $('[data-bx-table-status]', node) ||
                     (node.nextElementSibling && $('[data-bx-table-status]', node.nextElementSibling));
        var pager = $('[data-bx-table-pages]', node) ||
                    (node.nextElementSibling && $('[data-bx-table-pages]', node.nextElementSibling));

        function fold(s) {
            s = String(s).toLowerCase();
            if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
            return s;
        }

        function cellValue(row, i) {
            var cell = row.cells[i];
            if (!cell) return '';
            var raw = cell.getAttribute('data-bx-value');
            return raw !== null ? raw : cell.textContent.trim();
        }

        /* A column sorts as a number only when every value in it is one —
           otherwise "10" would sort before "9" in a column of mixed text. */
        function numericColumn(i) {
            return rows.every(function (r) {
                var v = cellValue(r, i);
                return v === '' || !isNaN(Number(v.replace(/[\s,]/g, '')));
            });
        }

        function visible() {
            if (!filter) return rows.slice();
            return rows.filter(function (r) { return fold(r.textContent).indexOf(filter) >= 0; });
        }

        function render() {
            var shown = visible();

            if (sortIndex >= 0) {
                var numeric = numericColumn(sortIndex);
                shown.sort(function (a, b) {
                    var x = cellValue(a, sortIndex), y = cellValue(b, sortIndex);
                    if (numeric) return (Number(x.replace(/[\s,]/g, '')) - Number(y.replace(/[\s,]/g, ''))) * sortDir;
                    return x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' }) * sortDir;
                });
            }

            var total = shown.length;
            var pages = perPage ? Math.max(1, Math.ceil(total / perPage)) : 1;
            if (page >= pages) page = pages - 1;
            var slice = perPage ? shown.slice(page * perPage, (page + 1) * perPage) : shown;

            rows.forEach(function (r) { if (r.parentNode) r.parentNode.removeChild(r); });
            slice.forEach(function (r) { body.appendChild(r); });

            if (!slice.length) {
                var empty = document.createElement('tr');
                var cell = document.createElement('td');
                cell.colSpan = 99;
                cell.className = 'bx-empty';
                cell.textContent = node.getAttribute('data-bx-empty') || (isFr() ? 'Aucun résultat.' : 'Nothing matches.');
                empty.appendChild(cell);
                body.appendChild(empty);
            }

            if (status) {
                status.textContent = perPage
                    ? (isFr() ? total + ' lignes · page ' + (page + 1) + ' sur ' + pages
                              : total + ' rows · page ' + (page + 1) + ' of ' + pages)
                    : (isFr() ? total + ' lignes' : total + ' rows');
            }

            if (pager) {
                pager.innerHTML = '';
                if (perPage && pages > 1) {
                    for (var i = 0; i < pages; i++) {
                        (function (n) {
                            var b = document.createElement('button');
                            b.type = 'button';
                            b.className = 'bx-page' + (n === page ? ' fx-active' : '');
                            b.textContent = n + 1;
                            on(b, 'click', function () { page = n; render(); });
                            pager.appendChild(b);
                        }(i));
                    }
                }
            }

            emit(node, 'table:render', { total: total, page: page });
        }

        $$('th[data-bx-sort]', table).forEach(function (th, i) {
            var index = th.cellIndex;
            th.setAttribute('tabindex', '0');
            th.setAttribute('role', 'columnheader');
            function toggle() {
                if (sortIndex === index) sortDir = -sortDir;
                else { sortIndex = index; sortDir = 1; }
                $$('th[data-bx-sort]', table).forEach(function (o) { o.removeAttribute('aria-sort'); });
                th.setAttribute('aria-sort', sortDir === 1 ? 'ascending' : 'descending');
                page = 0;
                render();
            }
            on(th, 'click', toggle);
            on(th, 'keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
        });

        if (search) {
            on(search, 'input', function () { filter = fold(search.value.trim()); page = 0; render(); });
        }

        render();
        return {
            filter: function (text) { filter = fold(text || ''); page = 0; render(); },
            sort: function (i, dir) { sortIndex = i; sortDir = dir === 'desc' ? -1 : 1; render(); }
        };
    }

    /* =====================================================================
       COMMAND PALETTE
       ===================================================================== */

    var palette = {
        node: null,
        items: [],
        active: 0,

        mount: function (node) {
            if (!node || node._bxPalette) return;
            node._bxPalette = true;
            this.node = node;
            var self = this;
            var input = $('input', node);
            var list = $('.bx-palette-list', node);
            if (!input || !list) return;

            /* The source is read out of the markup once, so the palette works
               with no configuration at all — the buttons already in the list
               are the commands. */
            this.items = $$('.bx-palette-item', list).map(function (el) {
                return {
                    el: el,
                    group: (el.closest('[data-bx-group]') || {}).getAttribute
                        ? el.closest('[data-bx-group]').getAttribute('data-bx-group') : '',
                    text: el.textContent.replace(/\s+/g, ' ').trim(),
                    href: el.getAttribute('data-bx-href') || el.getAttribute('href') || ''
                };
            });

            on(input, 'input', function () { self.filter(input.value); });
            on(input, 'keydown', function (e) {
                if (e.key === 'ArrowDown') { e.preventDefault(); self.move(1); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); self.move(-1); }
                else if (e.key === 'Enter') { e.preventDefault(); self.run(); }
                else if (e.key === 'Escape') { self.close(); }
            });
            on(node, 'click', function (e) { if (e.target === node) self.close(); });
        },

        fold: function (s) {
            s = String(s).toLowerCase();
            if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
            return s;
        },

        filter: function (query) {
            var needle = this.fold(query.trim());
            var shown = [];
            this.items.forEach(function (item) {
                var hit = !needle || this.fold(item.text).indexOf(needle) >= 0;
                item.el.hidden = !hit;
                if (hit) shown.push(item);
            }, this);

            /* A group heading with nothing under it is noise. */
            $$('[data-bx-group]', this.node).forEach(function (group) {
                var any = $$('.bx-palette-item', group).some(function (el) { return !el.hidden; });
                var head = group.previousElementSibling;
                if (head && head.classList.contains('bx-palette-group')) head.hidden = !any;
                group.hidden = !any;
            });

            this.shown = shown;
            this.active = 0;
            this.paint();
        },

        paint: function () {
            var shown = this.shown || this.items;
            shown.forEach(function (item, i) {
                item.el.classList.toggle('bx-active', i === this.active);
            }, this);
            if (shown[this.active]) shown[this.active].el.scrollIntoView({ block: 'nearest' });
        },

        move: function (step) {
            var shown = this.shown || this.items;
            if (!shown.length) return;
            this.active = (this.active + step + shown.length) % shown.length;
            this.paint();
        },

        run: function () {
            var shown = this.shown || this.items;
            var item = shown[this.active];
            if (!item) return;
            this.close();
            if (!emit(item.el, 'palette:run', { text: item.text })) return;
            if (item.href) window.location.href = item.href;
            else item.el.click();
        },

        open: function (sel) {
            var node = sel ? (typeof sel === 'string' ? $(sel) : sel) : this.node || $('.bx-palette');
            if (!node) return null;
            this.mount(node);
            this.node = node;
            node.classList.add('bx-open');
            node.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            var input = $('input', node);
            if (input) { input.value = ''; input.focus(); }
            this.filter('');
            emit(node, 'palette:shown');
            return node;
        },

        close: function () {
            if (!this.node) return;
            this.node.classList.remove('bx-open');
            this.node.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            emit(this.node, 'palette:hidden');
        },

        toggle: function (sel) {
            var node = sel ? (typeof sel === 'string' ? $(sel) : sel) : this.node || $('.bx-palette');
            if (node && node.classList.contains('bx-open')) { this.close(); return null; }
            return this.open(node);
        }
    };

    /* =====================================================================
       TREE VIEW
       ===================================================================== */

    function Tree(node) {
        function rows() { return $$('.bx-tree-row', node); }

        $$('.bx-tree-item', node).forEach(function (item) {
            var row = $('.bx-tree-row', item);
            var kids = item.querySelector(':scope > ul');
            if (!kids) item.classList.add('bx-tree-leaf');
            if (!row) return;

            row.setAttribute('role', 'treeitem');
            if (kids) row.setAttribute('aria-expanded', item.classList.contains('bx-open') ? 'true' : 'false');

            on(row, 'click', function () {
                if (kids) {
                    var open = !item.classList.contains('bx-open');
                    item.classList.toggle('bx-open', open);
                    row.setAttribute('aria-expanded', open ? 'true' : 'false');
                    emit(item, 'tree:' + (open ? 'expand' : 'collapse'));
                }
                rows().forEach(function (r) { r.classList.remove('bx-selected'); });
                row.classList.add('bx-selected');
                emit(node, 'tree:select', { label: row.textContent.trim(), row: row });
            });
        });

        node.setAttribute('role', 'tree');

        on(node, 'keydown', function (event) {
            var all = rows().filter(function (r) { return r.offsetParent !== null; });
            var at = all.indexOf(document.activeElement);
            if (at < 0) return;
            if (event.key === 'ArrowDown') { event.preventDefault(); (all[at + 1] || all[0]).focus(); }
            else if (event.key === 'ArrowUp') { event.preventDefault(); (all[at - 1] || all[all.length - 1]).focus(); }
            else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                var item = all[at].closest('.bx-tree-item');
                if (item && !item.classList.contains('bx-tree-leaf')) {
                    event.preventDefault();
                    item.classList.toggle('bx-open', event.key === 'ArrowRight');
                    all[at].setAttribute('aria-expanded', event.key === 'ArrowRight' ? 'true' : 'false');
                }
            }
        });

        return {
            expandAll: function () { $$('.bx-tree-item', node).forEach(function (i) { i.classList.add('bx-open'); }); },
            collapseAll: function () { $$('.bx-tree-item', node).forEach(function (i) { i.classList.remove('bx-open'); }); }
        };
    }

    /* =====================================================================
       SPLIT PANES
       ===================================================================== */

    function Panes(node) {
        var divider = $('.bx-panes-divider', node);
        if (!divider) return null;
        var vertical = node.classList.contains('bx-panes-v');
        var min = Number(node.getAttribute('data-bx-min') || 12);

        function setFrom(clientPos) {
            var box = node.getBoundingClientRect();
            var span = vertical ? box.height : box.width;
            var offset = (vertical ? clientPos - box.top : clientPos - box.left);
            var pct = Math.max(min, Math.min(100 - min, (offset / span) * 100));
            node.style.setProperty('--bx-pane', pct.toFixed(2) + '%');
            emit(node, 'panes:resize', { percent: pct });
        }

        function start(event) {
            event.preventDefault();
            divider.classList.add('bx-dragging');
            document.body.style.userSelect = 'none';
            document.body.style.cursor = vertical ? 'row-resize' : 'col-resize';

            function move(e) {
                var point = e.touches ? e.touches[0] : e;
                setFrom(vertical ? point.clientY : point.clientX);
            }
            function stop() {
                divider.classList.remove('bx-dragging');
                document.body.style.userSelect = '';
                document.body.style.cursor = '';
                document.removeEventListener('pointermove', move);
                document.removeEventListener('pointerup', stop);
            }
            document.addEventListener('pointermove', move);
            document.addEventListener('pointerup', stop);
        }

        on(divider, 'pointerdown', start);
        divider.setAttribute('role', 'separator');
        divider.setAttribute('tabindex', '0');
        divider.setAttribute('aria-orientation', vertical ? 'horizontal' : 'vertical');

        /* Keyboard resize, because a divider you can only drag is a divider
           half your users cannot move. */
        on(divider, 'keydown', function (event) {
            var current = parseFloat(getComputedStyle(node).getPropertyValue('--bx-pane')) || 50;
            var step = event.shiftKey ? 10 : 2;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault();
                node.style.setProperty('--bx-pane', Math.max(min, current - step) + '%');
            } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault();
                node.style.setProperty('--bx-pane', Math.min(100 - min, current + step) + '%');
            }
        });

        return { set: function (pct) { node.style.setProperty('--bx-pane', pct + '%'); } };
    }

    /* =====================================================================
       RATING
       ===================================================================== */

    function Rating(node) {
        var max = Number(node.getAttribute('data-bx-max') || 5);
        var value = Number(node.getAttribute('data-bx-value') || 0);
        var readonly = node.hasAttribute('data-bx-readonly');
        var out = $('.bx-rating-value', node.parentNode || node);

        node.innerHTML = '';
        node.setAttribute('role', readonly ? 'img' : 'radiogroup');
        if (readonly) {
            node.classList.add('bx-rating-readonly');
            node.setAttribute('aria-label', value + ' / ' + max);
        }

        for (var i = 1; i <= max; i++) {
            (function (n) {
                var star = document.createElement('button');
                star.type = 'button';
                star.className = 'bx-rating-star' + (n <= value ? ' fx-on' : '');
                star.innerHTML = '<i class="ay ay-star" aria-hidden="true"></i>';
                star.setAttribute('aria-label', n + ' / ' + max);
                if (!readonly) {
                    on(star, 'click', function () { set(n); });
                    on(star, 'keydown', function (e) {
                        if (e.key === 'ArrowRight') { e.preventDefault(); set(Math.min(max, value + 1)); }
                        if (e.key === 'ArrowLeft') { e.preventDefault(); set(Math.max(0, value - 1)); }
                    });
                }
                node.appendChild(star);
            }(i));
        }

        function set(n) {
            value = n;
            $$('.bx-rating-star', node).forEach(function (s, i) { s.classList.toggle('bx-on', i < n); });
            if (out) out.textContent = n + ' / ' + max;
            node.setAttribute('data-bx-value', n);
            emit(node, 'rating:change', { value: n });
        }

        return { value: function () { return value; }, set: set };
    }

    /* =====================================================================
       KANBAN
       ---------------------------------------------------------------------
       Native HTML drag and drop, plus a keyboard path — a board you can only
       use with a mouse is a board half your users cannot use.
       ===================================================================== */

    function Kanban(node) {
        var dragging = null;

        function wireCard(card) {
            if (card._bxWired) return;
            card._bxWired = true;
            card.setAttribute('draggable', 'true');
            card.setAttribute('tabindex', '0');

            on(card, 'dragstart', function (e) {
                dragging = card;
                card.classList.add('bx-dragging');
                if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', ''); }
            });
            on(card, 'dragend', function () {
                card.classList.remove('bx-dragging');
                dragging = null;
                $$('.bx-kanban-list', node).forEach(function (l) { l.classList.remove('bx-over'); });
                counts();
            });

            on(card, 'keydown', function (event) {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                event.preventDefault();
                var lists = $('.bx-kanban-list', node);
                var here = lists.indexOf(card.closest('.bx-kanban-list'));
                var to = lists[here + (event.key === 'ArrowRight' ? 1 : -1)];
                if (!to) return;
                to.appendChild(card);
                card.focus();
                counts();
                emit(node, 'kanban:move', { card: card, to: to });
            });
        }

        function counts() {
            $$('.bx-kanban-col', node).forEach(function (col) {
                var badge = $('.bx-kanban-count', col);
                if (badge) badge.textContent = $$('.bx-kanban-card', col).length;
            });
        }

        $$('.bx-kanban-card', node).forEach(wireCard);

        $$('.bx-kanban-list', node).forEach(function (list) {
            on(list, 'dragover', function (e) {
                e.preventDefault();
                list.classList.add('bx-over');
                if (!dragging) return;
                /* Insert before the first card whose midpoint is below the
                   pointer — which is what makes the gap open where you expect
                   rather than always appending. */
                var after = $$('.bx-kanban-card:not(.bx-dragging)', list).filter(function (c) {
                    return e.clientY < c.getBoundingClientRect().top + c.offsetHeight / 2;
                })[0];
                if (after) list.insertBefore(dragging, after);
                else list.appendChild(dragging);
            });
            on(list, 'dragleave', function () { list.classList.remove('bx-over'); });
            on(list, 'drop', function (e) {
                e.preventDefault();
                list.classList.remove('bx-over');
                counts();
                if (dragging) emit(node, 'kanban:move', { card: dragging, to: list });
            });
        });

        counts();
        return { refresh: function () { $$('.bx-kanban-card', node).forEach(wireCard); counts(); } };
    }

    /* =====================================================================
       TOUR / COACHMARKS
       ===================================================================== */

    var tour = {
        steps: [],
        at: 0,
        spot: null,
        pop: null,

        start: function (steps) {
            this.steps = steps || [];
            if (!this.steps.length) return;
            this.at = 0;

            if (!this.spot) {
                this.spot = document.createElement('div');
                this.spot.className = 'bx-tour-spot';
                document.body.appendChild(this.spot);
            }
            if (!this.pop) {
                this.pop = document.createElement('div');
                this.pop.className = 'bx-tour-pop';
                this.pop.setAttribute('role', 'dialog');
                document.body.appendChild(this.pop);
            }
            this.spot.hidden = false;
            this.pop.hidden = false;
            this.show();

            var self = this;
            this._keys = function (e) {
                if (e.key === 'Escape') self.stop();
                if (e.key === 'ArrowRight') self.next();
                if (e.key === 'ArrowLeft') self.prev();
            };
            document.addEventListener('keydown', this._keys);
            window.addEventListener('resize', this._resize = function () { self.show(); });
        },

        show: function () {
            var step = this.steps[this.at];
            if (!step) return this.stop();
            var target = typeof step.target === 'string' ? $(step.target) : step.target;
            if (!target) return this.next();

            target.scrollIntoView({ block: 'center', behavior: 'smooth' });

            var box = target.getBoundingClientRect();
            var pad = step.pad === undefined ? 6 : step.pad;
            this.spot.style.top = (box.top + window.pageYOffset - pad) + 'px';
            this.spot.style.left = (box.left + window.pageXOffset - pad) + 'px';
            this.spot.style.width = (box.width + pad * 2) + 'px';
            this.spot.style.height = (box.height + pad * 2) + 'px';

            var fr = isFr();
            var dots = this.steps.map(function (s, i) {
                return '<span class="bx-tour-dot' + (i === this.at ? ' fx-on' : '') + '"></span>';
            }, this).join('');

            this.pop.innerHTML =
                '<p class="bx-tour-step">' + (fr ? 'Étape ' : 'Step ') + (this.at + 1) + '/' + this.steps.length + '</p>' +
                '<h3 class="bx-tour-title">' + (step.title || '') + '</h3>' +
                '<div class="bx-tour-body"><p class="bx-mb-0">' + (step.body || '') + '</p></div>' +
                '<div class="bx-tour-foot">' +
                  '<span class="bx-tour-dots">' + dots + '</span>' +
                  '<span class="bx-cluster fx-gap-2">' +
                    '<button type="button" class="bx-btn fx-btn-ghost fx-btn-sm" data-bx-tour="stop">' +
                      (fr ? 'Quitter' : 'Skip') + '</button>' +
                    (this.at > 0 ? '<button type="button" class="bx-btn fx-btn-sm" data-bx-tour="prev">' + (fr ? 'Retour' : 'Back') + '</button>' : '') +
                    '<button type="button" class="bx-btn fx-btn-primary fx-btn-sm" data-bx-tour="next">' +
                      (this.at === this.steps.length - 1 ? (fr ? 'Terminer' : 'Done') : (fr ? 'Suivant' : 'Next')) + '</button>' +
                  '</span>' +
                '</div>';

            var self = this;
            $$('[data-bx-tour]', this.pop).forEach(function (b) {
                on(b, 'click', function () {
                    var what = b.getAttribute('data-bx-tour');
                    if (what === 'next') self.next();
                    else if (what === 'prev') self.prev();
                    else self.stop();
                });
            });

            /* Below the target unless that would fall off the screen. */
            var p = this.pop.getBoundingClientRect();
            var top = box.bottom + 14;
            if (top + p.height > window.innerHeight) top = Math.max(14, box.top - p.height - 14);
            var left = Math.max(14, Math.min(box.left, window.innerWidth - p.width - 14));
            this.pop.style.top = (top + window.pageYOffset) + 'px';
            this.pop.style.left = (left + window.pageXOffset) + 'px';

            emit(root, 'tour:step', { index: this.at, step: step });
        },

        next: function () { this.at++; this.at >= this.steps.length ? this.stop() : this.show(); },
        prev: function () { if (this.at > 0) { this.at--; this.show(); } },

        stop: function () {
            if (this.spot) this.spot.hidden = true;
            if (this.pop) this.pop.hidden = true;
            document.removeEventListener('keydown', this._keys);
            window.removeEventListener('resize', this._resize);
            emit(root, 'tour:end', { index: this.at });
        }
    };

    /* =====================================================================
       SMALL PIECES: countdown, radial, collapse, segmented, swap, diff
       ===================================================================== */

    function Countdown(node) {
        var target = new Date(node.getAttribute('data-bx-until') || '').getTime();
        if (isNaN(target)) return null;
        var fr = isFr();
        var labels = fr ? ['jours', 'heures', 'min', 'sec'] : ['days', 'hours', 'min', 'sec'];

        node.innerHTML = labels.map(function (l) {
            return '<span class="bx-countdown-part"><span class="bx-countdown-num">00</span>' +
                   '<span class="bx-countdown-label">' + l + '</span></span>';
        }).join('');
        var nums = $$('.bx-countdown-num', node);

        function tick() {
            var left = Math.max(0, target - Date.now());
            var s = Math.floor(left / 1000);
            var parts = [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60];
            parts.forEach(function (v, i) { nums[i].textContent = String(v).padStart(2, '0'); });
            if (left <= 0) { clearInterval(timer); emit(node, 'countdown:end'); }
        }
        tick();
        var timer = setInterval(tick, 1000);
        return { stop: function () { clearInterval(timer); } };
    }

    function Diff(node) {
        var handle = $('.bx-diff-handle', node);
        if (!handle) return null;
        function setFrom(x) {
            var box = node.getBoundingClientRect();
            var pct = Math.max(0, Math.min(100, ((x - box.left) / box.width) * 100));
            node.style.setProperty('--bx-diff', pct.toFixed(2) + '%');
        }
        on(handle, 'pointerdown', function (event) {
            event.preventDefault();
            function move(e) { setFrom((e.touches ? e.touches[0] : e).clientX); }
            function stop() {
                document.removeEventListener('pointermove', move);
                document.removeEventListener('pointerup', stop);
            }
            document.addEventListener('pointermove', move);
            document.addEventListener('pointerup', stop);
        });
        return null;
    }

    function wireDelegates() {
        on(document, 'click', function (event) {
            var trigger = event.target.closest ? event.target.closest('[data-bx-toggle]') : null;
            if (trigger) {
                var what = trigger.getAttribute('data-bx-toggle');
                if (what === 'modal')    { event.preventDefault(); modal.open(targetOf(trigger)); return; }
                if (what === 'drawer')   { event.preventDefault(); drawer.open(targetOf(trigger)); return; }
                if (what === 'dropdown') { event.preventDefault(); dropdown.toggle(trigger); return; }
                if (what === 'tab')      { event.preventDefault(); tab.show(trigger); return; }
                if (what === 'collapse') { event.preventDefault(); collapse.toggle(targetOf(trigger)); return; }
                if (what === 'popover')  { event.preventDefault(); popover.toggle(trigger); return; }
                if (what === 'mode')     { event.preventDefault(); skin.toggleMode(); return; }
                if (what === 'navbar')   {
                    event.preventDefault();
                    var menu = targetOf(trigger) || $('.bx-navbar-nav', trigger.closest('.bx-navbar'));
                    if (menu) {
                        var open = menu.classList.toggle('bx-open');
                        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
                    }
                    return;
                }
                if (what === 'palette')   { event.preventDefault(); palette.toggle(targetOf(trigger)); return; }
                if (what === 'swap') {
                    event.preventDefault();
                    trigger.classList.toggle('bx-active');
                    trigger.setAttribute('aria-pressed', trigger.classList.contains('bx-active') ? 'true' : 'false');
                    return;
                }
            }

            /* Segmented controls and toolbars share one behaviour: exactly one
               of a group is live, so the group is the scope and not the page. */
            var segment = event.target.closest ? event.target.closest('.bx-segment') : null;
            if (segment) {
                var sgroup = segment.closest('.bx-segmented');
                if (sgroup) {
                    $$('.bx-segment', sgroup).forEach(function (s) {
                        s.classList.remove('bx-active');
                        s.setAttribute('aria-pressed', 'false');
                    });
                    segment.classList.add('bx-active');
                    segment.setAttribute('aria-pressed', 'true');
                    emit(sgroup, 'segment:change', { value: segment.getAttribute('data-bx-value') || segment.textContent.trim() });
                }
            }

            var dockItem = event.target.closest ? event.target.closest('.bx-dock-item') : null;
            if (dockItem && dockItem.closest('.bx-dock')) {
                $$('.bx-dock-item', dockItem.closest('.bx-dock')).forEach(function (d) { d.classList.remove('bx-active'); });
                dockItem.classList.add('bx-active');
            }

            var dismiss = event.target.closest ? event.target.closest('[data-bx-dismiss]') : null;
            if (dismiss) {
                var kind = dismiss.getAttribute('data-bx-dismiss');
                event.preventDefault();
                if (kind === 'modal') modal.close(dismiss.closest('.bx-modal'));
                else if (kind === 'drawer') drawer.close(dismiss.closest('.bx-drawer'));
                else if (kind === 'alert') {
                    var a = dismiss.closest('.bx-alert, .bx-callout');
                    if (a && a.parentNode) a.parentNode.removeChild(a);
                } else if (kind === 'toast') {
                    var t = dismiss.closest('.bx-toast');
                    if (t) { t.classList.remove('bx-open');
                        window.setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 250); }
                } else if (kind === 'chip') {
                    var c = dismiss.closest('.bx-chip');
                    if (c && c.parentNode) c.parentNode.removeChild(c);
                }
                return;
            }

            if (!event.target.closest || !event.target.closest('.bx-dropdown')) dropdown.closeAll();
            if (!event.target.closest || !event.target.closest('.bx-popover, [data-bx-toggle="popover"]')) popover.closeAll();
        });

        on(document, 'keydown', function (event) {
            /* Ctrl/Cmd+K is the command palette everywhere it exists, and the
               shortcut is claimed only when a palette is actually on the page. */
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                var pbox = $('.bx-palette');
                if (pbox) { event.preventDefault(); palette.toggle(pbox); return; }
            }
            if (event.key !== 'Escape') return;
            if ($('.bx-palette.bx-open')) { palette.close(); return; }
            if (openModals.length) { modal.close(); return; }
            if (openDrawers.length) { drawer.close(); return; }
            dropdown.closeAll();
            popover.closeAll();
        });
    }

    /** Per-element setup. Safe to run repeatedly. */
    function wire(scope) {
        scope = scope || document;

        /* Every component below is built once per node and remembers that it
           was, so the MutationObserver can call this on every insertion
           without doubling anything up. */
        var once = [
            ['.bx-combobox', '_bxCombobox', Combobox],
            ['.bx-calendar[data-bx-calendar]', '_bxCalendar', Calendar],
            ['.bx-datepicker', '_bxDatePicker', DatePicker],
            ['[data-bx-datatable]', '_bxDataTable', DataTable],
            ['.bx-tree', '_bxTree', Tree],
            ['.bx-panes', '_bxPanes', Panes],
            ['.bx-rating', '_bxRating', Rating],
            ['.bx-kanban', '_bxKanban', Kanban],
            ['.bx-countdown', '_bxCountdown', Countdown],
            ['.bx-diff', '_bxDiff', Diff]
        ];
        once.forEach(function (spec) {
            $$(spec[0], scope).forEach(function (n) {
                if (n[spec[1]]) return;
                n[spec[1]] = spec[2](n) || true;
            });
        });

        $$('.bx-palette', scope).forEach(function (n) { palette.mount(n); });

        /* A radial reads its own value attribute, so markup alone is enough. */
        $$('.bx-radial[data-bx-value]', scope).forEach(function (n) {
            n.style.setProperty('--bx-value', n.getAttribute('data-bx-value'));
        });

        $$('[data-bx-scrollspy]', scope).forEach(function (n) {
            if (n._bxSpy) return;
            n._bxSpy = Scrollspy(n);
        });

        /* A marquee only loops seamlessly if the track appears twice. */
        $$('.bx-marquee', scope).forEach(function (m) {
            if (m._bxDone) return;
            m._bxDone = true;
            var track = $('.bx-marquee-track', m);
            if (track) m.appendChild(track.cloneNode(true));
        });

        $$('[data-bx-skin-menu]', scope).forEach(function () { skin.paintMenus(); });

        /* Direct setters, for pages that want their own buttons. */
        $$('[data-bx-set-theme]', scope).forEach(function (b) {
            if (b._bxDone) return; b._bxDone = true;
            on(b, 'click', function () { skin.setTheme(b.getAttribute('data-bx-set-theme')); });
        });
        $$('[data-bx-set-family]', scope).forEach(function (b) {
            if (b._bxDone) return; b._bxDone = true;
            on(b, 'click', function () { skin.setFamily(b.getAttribute('data-bx-set-family')); });
        });
        $$('[data-bx-set-corners]', scope).forEach(function (b) {
            if (b._bxDone) return; b._bxDone = true;
            on(b, 'click', function () { skin.corners(b.getAttribute('data-bx-set-corners')); });
        });
        $$('[data-bx-set-font]', scope).forEach(function (b) {
            if (b._bxDone) return; b._bxDone = true;
            on(b, 'click', function () { skin.font(b.getAttribute('data-bx-set-font')); });
        });
    }

    /* ------------------------------------------------------------------ boot */

    /* Restore before first paint where possible; the inline snippet in the page
       head normally beats this to it, and this catches pages without one.
       An empty stored value is treated as "nothing chosen" and cleared, so a
       visitor left over from the old build is not stuck on a broken toggle. */
    (function restore() {
        var t = store('theme');
        if (t) root.setAttribute('data-theme', t);
        else if (t === '') store('theme', null);
        var c = store('corners'); if (c) root.setAttribute('data-corners', c);
        var f = store('font'); if (f) root.setAttribute('data-font', f);
    }());

    function boot() {
        wireDelegates();
        wire(document);
        skin.paintMenus();

        if ('MutationObserver' in window) {
            new MutationObserver(function (records) {
                for (var i = 0; i < records.length; i++) {
                    if (records[i].addedNodes.length) { wire(document); return; }
                }
            }).observe(document.body, { childList: true, subtree: true });
        }

        root.classList.add('bx-ready');
        emit(root, 'ready', { version: VERSION });
    }

    if (document.readyState === 'loading') on(document, 'DOMContentLoaded', boot);
    else boot();

    /* ------------------------------------------------------------- the API */

    window.Brutalix = {
        version: VERSION,
        skin: skin,
        theme: skin,          /* alias, because half the ecosystem calls it that */
        modal: modal,
        drawer: drawer,
        dropdown: dropdown,
        tab: tab,
        collapse: collapse,
        toast: toast,
        popover: popover,
        palette: palette,
        tour: tour,
        combobox: function (sel) { var n = typeof sel === 'string' ? $(sel) : sel; return n ? n._bxCombobox : null; },
        datepicker: function (sel) { var n = typeof sel === 'string' ? $(sel) : sel; return n ? n._bxDatePicker : null; },
        calendar: function (sel) { var n = typeof sel === 'string' ? $(sel) : sel; return n ? n._bxCalendar : null; },
        datatable: function (sel) { var n = typeof sel === 'string' ? $(sel) : sel; return n ? n._bxDataTable : null; },
        tree: function (sel) { var n = typeof sel === 'string' ? $(sel) : sel; return n ? n._bxTree : null; },
        panes: function (sel) { var n = typeof sel === 'string' ? $(sel) : sel; return n ? n._bxPanes : null; },
        rating: function (sel) { var n = typeof sel === 'string' ? $(sel) : sel; return n ? n._bxRating : null; },
        kanban: function (sel) { var n = typeof sel === 'string' ? $(sel) : sel; return n ? n._bxKanban : null; },
        refresh: function (scope) { wire(scope); },
        $: $,
        $$: $$
    };

}(window, document));
