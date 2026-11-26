// dsh-plugin-page-tools — browser half.
//
// Loaded by dsh-client-modules as a classic script and registered through the
// shell's lazy-CJS module table (window.__ModuleLoader__.load), the same shape
// the shipped ui-* bundles emit. It owns no Host capability and changes what
// the page shows, never how the shell works:
//
// The Plugins page's Installed tab keeps its shipped markup. This bundle
// prepends a control block to that panel — a search field over plugin names
// and descriptions, the match count, the empty-result line — and appends one
// right-aligned row after the cards: the range, the cards-per-page field, and
// the pages. It hides the cards the query or the page drops, ten per
// page by default, and a MutationObserver re-applies the view whenever the
// shipped page re-renders its cards, so enabling a plugin never resets the
// search.
window.__ModuleLoader__.load({
  id: 'dsh-plugin-page-tools',
  factory: require => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    var MutationObserverClass = typeof globalThis.MutationObserver === 'function' ? globalThis.MutationObserver : null

    /* ── copy ───────────────────────────────────────────────────── */

    var NS = 'dsh-plugin-page-tools'

    var zh = {
      'installed.search': '搜索插件名称或简介',
      'installed.searchLabel': '搜索已安装的插件',
      'installed.clear': '清除搜索',
      'installed.empty': '没有匹配「{query}」的插件。',
      'installed.match': '{shown}/{total}',
      'pager.first': '第一页',
      'pager.previous': '上一页',
      'pager.next': '下一页',
      'pager.last': '最后一页',
      'pager.page': '第 {page} 页',
      'pager.pageCurrent': '第 {page} 页，当前页',
      'pager.label': '已安装插件分页',
      'pager.size': '每页',
      'pager.sizeUnit': '条',
      'pager.sizeLabel': '每页显示的插件条数，当前 {size} 条',
      'pager.range': '第 {from}–{to} 条，共 {total} 条',
    }

    var en = {
      'installed.search': 'Search plugin names and descriptions',
      'installed.searchLabel': 'Search installed plugins',
      'installed.clear': 'Clear search',
      'installed.empty': 'No plugin matches “{query}”.',
      'installed.match': '{shown}/{total}',
      'pager.first': 'First page',
      'pager.previous': 'Previous page',
      'pager.next': 'Next page',
      'pager.last': 'Last page',
      'pager.page': 'Page {page}',
      'pager.pageCurrent': 'Page {page}, current',
      'pager.label': 'Installed plugin pages',
      'pager.size': 'Per page',
      'pager.sizeUnit': 'items',
      'pager.sizeLabel': 'Plugins shown per page, {size} now',
      'pager.range': '{from}–{to} of {total}',
    }

    /**
     * Substitute `{name}` placeholders.
     * @param text - template.
     * @param params - values by name.
     * @returns the filled text.
     */
    function format (text, params) {
      return text.replace(/\{(\w+)\}/gu, function (whole, name) {
        return params !== undefined && name in params ? String(params[name]) : whole
      })
    }

    /**
     * One translate function for this namespace, reading the active locale on
     * every call.
     * @param ctx - client root context.
     * @returns the translate function.
     */
    function translate (ctx) {
      return function (key, params) {
        var active = ''
        try {
          active = String(ctx.locale.getSnapshot().active).toLowerCase()
        } catch (error) {
          active = ''
        }
        var table = active.indexOf('zh') === 0 ? zh : en
        var text = table[key] !== undefined ? table[key] : (en[key] !== undefined ? en[key] : key)
        return params === undefined ? text : format(text, params)
      }
    }

    /* ── small helpers ──────────────────────────────────────────── */

    /**
     * Write an attribute only while it differs: the observer watches the same
     * subtree, so a redundant write would feed it again.
     * @param element - target element.
     * @param name - attribute name.
     * @param value - attribute value, or null to remove it.
     */
    function setAttr (element, name, value) {
      if (element === null || element === undefined) return
      if (value === null) {
        if (element.hasAttribute(name)) element.removeAttribute(name)
      } else if (element.getAttribute(name) !== value) {
        element.setAttribute(name, value)
      }
    }

    /**
     * Fold text for matching: lower case and collapsed whitespace. CJK needs no
     * tokenizing, so a query matches inside a longer title.
     * @param text - source text.
     * @returns the folded text.
     */
    function fold (text) {
      return text.toLowerCase().replace(/\s+/gu, ' ').trim()
    }

    /**
     * The substrings a query requires every match to contain.
     * @param query - raw query.
     * @returns the tokens, empty for a blank query.
     */
    function tokensOf (query) {
      return fold(query).split(' ').filter(function (token) { return token !== '' })
    }

    /* ── styles ─────────────────────────────────────────────────── */

    var P = 'dship'
    var cx = {
      slot: P + '-slot',
      field: P + '-field',
      icon: P + '-icon',
      input: P + '-input',
      count: P + '-count',
      searchRow: P + '-search-row',
      footBlock: P + '-foot-block',
      clear: P + '-clear',
      empty: P + '-empty',
      pager: P + '-pager',
      pagerInfo: P + '-pager-info',
      pagerPages: P + '-pager-pages',
      pagerButton: P + '-pager-button',
      pagerCurrent: P + '-pager-current',
      size: P + '-size',
      sizeInput: P + '-size-input',
      sizeText: P + '-size-text',
    }

    var CSS = [
      '.' + cx.slot + '{display:flex;flex-direction:column;gap:12px;width:100%;padding:4px 0 8px}',
      '.' + cx.searchRow + '{display:flex;align-items:center;gap:10px;width:100%}',
      /* The search block in flow at the panel's top. */
      '.' + cx.field + '{position:relative;display:flex;flex:1 1 auto;align-items:center;min-width:0;color:var(--dsw-alias-label-tertiary)}',
      '.' + cx.icon + '{position:absolute;left:12px;display:inline-flex;pointer-events:none}',
      '.' + cx.icon + '>svg{display:block}',
      '.' + cx.input + '{width:100%;height:36px;box-sizing:border-box;border:0.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md);padding:0 34px 0 36px;outline:none;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px}',
      '.' + cx.input + '::placeholder{color:var(--dsw-alias-label-tertiary)}',
      '.' + cx.input + ':focus-visible{border-color:var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary)) 18%, transparent)}',
      '.' + cx.input + '::-webkit-search-cancel-button{display:none}',
      '.' + cx.clear + '{position:absolute;right:6px;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:15px;line-height:1;cursor:pointer}',
      '@media (hover:hover){.' + cx.clear + ':hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}}',
      '.' + cx.footBlock + '{display:flex;flex-direction:column;gap:8px;width:100%}',
      '.' + cx.footBlock + '[hidden]{display:none}',
      '.' + cx.count + '{flex:none;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:20px;white-space:nowrap}',
      '.' + cx.empty + '{margin:0;padding:16px;border:0.5px dashed var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg);color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px;text-align:center}',
      '.' + cx.empty + '[hidden]{display:none}',
      '.' + cx.empty + '>strong{font-weight:500;color:var(--dsw-alias-label-secondary)}',
      /* One row at the panel's end, all of it against the trailing edge: range,
         then the cards-per-page field, then the pages. */
      '.' + cx.pager + '{display:flex;align-items:center;justify-content:flex-end;gap:12px;margin:0;padding:12px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:20px}',
      '.' + cx.pagerInfo + '{white-space:nowrap}',
      '.' + cx.pagerPages + '{display:flex;align-items:center;gap:2px}',
      '.' + cx.pagerButton + '{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 6px;border:0.5px solid transparent;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:20px;cursor:pointer}',
      '@media (hover:hover){.' + cx.pagerButton + ':hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}}',
      '.' + cx.pagerButton + ':disabled{opacity:.35;cursor:default;background:transparent}',
      '.' + cx.pagerButton + ':focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}',
      '.' + cx.pagerCurrent + '{border-color:var(--dsw-alias-border-l3);color:var(--dsw-alias-label-primary);font-weight:500;cursor:default}',
      '.' + cx.pager + '[data-flat]{gap:16px}',
      '.' + cx.pager + '[data-flat] .' + cx.pagerPages + '{display:none}',
      /* Cards per page: a number that commits on Enter or blur, beside the range. */
      '.' + cx.size + '{flex:none;display:inline-flex;align-items:center;gap:6px;min-height:28px;white-space:nowrap}',
      '.' + cx.sizeText + '{color:var(--dsw-alias-label-tertiary)}',
      '.' + cx.sizeInput + '{width:56px;height:28px;padding:0 6px;box-sizing:border-box;border:0.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:20px;text-align:center}',
      '.' + cx.sizeInput + ':focus{outline:none;border-color:var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary)) 18%,transparent)}',
      '.' + cx.sizeInput + '::-webkit-inner-spin-button,' + '.' + cx.sizeInput + '::-webkit-outer-spin-button{opacity:0.6}',
      /* Cards and groups the query or the page drops. */
      '[data-dsh-plugin-page-tools-hidden]{display:none !important}',
    ].join('\n')

    /* ── the Installed group ────────────────────────────────────── */

    var HIDDEN_ATTR = 'data-dsh-plugin-page-tools-hidden'
    var PAGE_SIZE = 10
    var SIZE_MIN = 1
    var SIZE_MAX = 100
    var SIZE_KEY = 'dsh-plugin-page-tools.page-size'
    var PAGE_KEY = 'dsh-plugin-page-tools.page'

    /** Remembered cards per page, falling back to the default. */
    function readSize () {
      try {
        var stored = Number(window.localStorage.getItem(SIZE_KEY))
        if (Number.isFinite(stored) && stored >= SIZE_MIN && stored <= SIZE_MAX) return Math.round(stored)
      } catch (error) { /* storage may be denied: the default stands. */ }
      return PAGE_SIZE
    }

    function writeSize (size) {
      try { window.localStorage.setItem(SIZE_KEY, String(size)) } catch (error) { /* nothing to keep. */ }
    }

    function clampSize (value) {
      var size = Math.round(Number(String(value).trim()))
      if (!Number.isFinite(size)) return PAGE_SIZE
      return Math.min(SIZE_MAX, Math.max(SIZE_MIN, size))
    }

    /** Remembered current page, falling back to the first page. */
    function readPage () {
      try {
        var stored = Number(window.localStorage.getItem(PAGE_KEY))
        if (Number.isFinite(stored) && stored >= 1) return Math.floor(stored)
      } catch (error) { /* storage may be denied: the first page stands. */ }
      return 1
    }

    function writePage (page) {
      try {
        if (String(page) !== window.localStorage.getItem(PAGE_KEY)) window.localStorage.setItem(PAGE_KEY, String(page))
      } catch (error) { /* nothing to keep. */ }
    }

    /** The first card the reader can actually see in the group. */
    function firstVisible (cards) {
      for (var card of cards) if (!card.hasAttribute(HIDDEN_ATTR)) return card
      return null
    }
    var NEIGHBOURS = 1
    /** Marks the search block this bundle puts under a group's heading. */
    var SLOT_ATTR = 'data-dsh-plugin-page-tools-installed'
    /** Marks the pager block this bundle keeps at a group's end. */
    var PAGER_ATTR = 'data-dsh-plugin-page-tools-pager'
    /**
     * The group this bundle searches and paginates: the shipped page prints
     * `data-plugin-group="bundles"` for the plugins the profile installed. The
     * built-in and experimental groups keep their own presentation.
     */
    var GROUP_SELECTOR = '[data-plugin-group="bundles"]'

    /** Own magnifier artwork, so no shipped icon export is required. */
    var SEARCH_SVG = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="6.75" cy="6.75" r="4.25"/><path d="M10.2 10.2 L14 14"/></svg>'

    var cardText = new WeakMap()

    /**
     * Read the text a shipped card is searched by: its title, description and
     * package name.
     * @param card - one rendered package card.
     * @returns the folded text.
     */
    function readCard (card) {
      var title = card.querySelector('[class*="cardTitle"]')
      var desc = card.querySelector('[class*="cardDesc"]')
      return fold((title === null ? '' : title.textContent) + '\n' + (desc === null ? '' : desc.textContent) + '\n'
        + (card.getAttribute('data-plugin-package') || ''))
    }

    /**
     * Text one card is searched by, read once per card element.
     * @param card - one rendered package card.
     * @returns the folded text.
     */
    function textOf (card) {
      var known = cardText.get(card)
      if (known !== undefined) return known
      var value = readCard(card)
      cardText.set(card, value)
      return value
    }

    /**
     * The cards of one group.
     * @param group - one group section.
     * @returns the cards in display order.
     */
    function cardsIn (group) {
      return Array.prototype.slice.call(group.querySelectorAll('[data-plugin-package]'))
    }

    /**
     * Apply the query and the page to one group: hide the cards either one
     * drops, hide the list element when nothing is left, and park the pager
     * after the cards.
     * @param group - the group section this bundle adopted.
     * @param pager - the pager block this bundle owns.
     * @param query - the raw query.
     * @param page - the wanted page.
     * @returns the applied view.
     */
    /** The last view's matches, so a click can keep the reader's place. */
    var buckets = []

    function applyView (group, pager, query, page, size) {
      buckets.length = 0
      var tokens = tokensOf(query)
      var cards = cardsIn(group)
      var matched = []
      for (var candidate of cards) {
        var text = textOf(candidate)
        var keep = true
        for (var token of tokens) {
          if (text.indexOf(token) === -1) { keep = false; break }
        }
        if (keep) matched.push(candidate)
      }
      buckets.push(matched)
      var pages = Math.max(1, Math.ceil(matched.length / size))
      var current = Math.min(Math.max(1, page), pages)
      var first = (current - 1) * size
      var shown = matched.slice(first, first + size)
      for (var entry of cards) setAttr(entry, HIDDEN_ATTR, shown.indexOf(entry) === -1 ? '' : null)
      // A list that lost every card still holds its margin: hide the list, not
      // the group, so the heading and the search block stay in place.
      for (var list of group.querySelectorAll('ul')) {
        var anyShown = false
        for (var inside of cardsIn(list)) if (!inside.hasAttribute(HIDDEN_ATTR)) anyShown = true
        if (cardsIn(list).length > 0) setAttr(list, HIDDEN_ATTR, anyShown ? null : '')
      }
      // The pager and the empty line live at the group's end, outside the
      // card list, so hiding the list never takes them with it.
      if (!group.contains(pager) || group.lastElementChild !== pager) group.append(pager)
      return {
        page: current,
        pages: pages,
        total: matched.length,
        all: cards.length,
        from: matched.length === 0 ? 0 : first + 1,
        to: matched.length === 0 ? 0 : first + shown.length,
      }
    }

    /**
     * The page numbers printed between the chevrons.
     * @param page - current page.
     * @param pages - page count.
     * @returns ascending numbers: both ends plus a window around the page.
     */
    function pageNumbers (page, pages) {
      var keep = {}
      keep[1] = true
      keep[pages] = true
      for (var offset = -NEIGHBOURS; offset <= NEIGHBOURS; offset += 1) {
        var candidate = page + offset
        if (candidate >= 2 && candidate <= pages - 1) keep[candidate] = true
      }
      var numbers = []
      for (var number = 1; number <= pages; number += 1) if (keep[number] === true) numbers.push(number)
      return numbers
    }

    /**
     * Build one pager button.
     * @param label - its accessible name.
     * @param face - its visible text.
     * @param extra - extra class names.
     * @param onPick - the click handler, or undefined while it is added later.
     * @returns the button.
     */
    function pagerButton (label, face, extra, onPick) {
      var button = document.createElement('button')
      button.type = 'button'
      button.className = extra === undefined ? cx.pagerButton : cx.pagerButton + ' ' + extra
      button.setAttribute('aria-label', label)
      button.title = label
      button.textContent = face
      if (onPick !== undefined) button.addEventListener('click', onPick)
      return button
    }

    /**
     * Mount one group's controls as plain DOM: the search block right under the
     * group's heading, the pager and the empty line at the end. Every write is
     * idempotent, so a repeated pass settles instead of feeding the observer.
     * @param group - the group section to adopt.
     * @param text - translate function.
     * @returns the mounted controls.
     */
    function mountGroup (group, text) {
      var state = { query: '', page: readPage(), size: readSize() }
      var holder = document.createElement('div')
      holder.setAttribute(SLOT_ATTR, '')
      holder.className = cx.slot
      var field = document.createElement('div')
      field.className = cx.field
      var icon = document.createElement('span')
      icon.className = cx.icon
      icon.innerHTML = SEARCH_SVG
      var input = document.createElement('input')
      input.type = 'search'
      input.className = cx.input
      var clear = document.createElement('button')
      clear.type = 'button'
      clear.className = cx.clear
      clear.textContent = '\u00d7'
      clear.hidden = true
      field.append(icon, input, clear)
      var count = document.createElement('span')
      count.className = cx.count
      var row = document.createElement('div')
      row.className = cx.searchRow
      row.append(field, count)
      holder.append(row)

      var foot = document.createElement('div')
      foot.setAttribute(PAGER_ATTR, '')
      foot.className = cx.footBlock
      var empty = document.createElement('p')
      empty.className = cx.empty
      empty.hidden = true
      var pager = document.createElement('nav')
      pager.className = cx.pager
      var range = document.createElement('span')
      range.className = cx.pagerInfo
      var buttons = document.createElement('span')
      buttons.className = cx.pagerPages
      var sizeInput = document.createElement('input')
      sizeInput.type = 'number'
      sizeInput.className = cx.sizeInput
      sizeInput.min = String(SIZE_MIN)
      sizeInput.max = String(SIZE_MAX)
      sizeInput.step = '1'
      sizeInput.inputMode = 'numeric'
      // Enter and blur commit; a half-typed number never resizes the list.
      sizeInput.addEventListener('change', function () { setSize(sizeInput.value) })
      sizeInput.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter') return
        event.preventDefault()
        setSize(sizeInput.value)
      })
      // Wheel and arrows belong to the field, not to the page behind it.
      sizeInput.addEventListener('wheel', function (event) { event.stopPropagation() })
      var sizeField = document.createElement('label')
      sizeField.className = cx.size
      var sizeBefore = document.createElement('span')
      sizeBefore.className = cx.sizeText
      var sizeAfter = document.createElement('span')
      sizeAfter.className = cx.sizeText
      sizeField.append(sizeBefore, sizeInput, sizeAfter)

      // One row at the panel's end, right-aligned as a whole: the range, then the
      // cards-per-page field, then the pages.
      pager.append(range, sizeField, buttons)
      foot.append(empty, pager)

      var setQuery = function (value) {
        if (state.query === value) return
        state = { query: value, page: 1, size: state.size }
        if (input.value !== value) input.value = value
        paint()
      }
      var setPage = function (value) {
        if (state.page === value) return
        state = { query: state.query, page: value, size: state.size }
        paint()
      }
      var setSize = function (value) {
        var size = clampSize(value)
        var anchor = firstVisible(cardsIn(group))
        var index = anchor === null ? -1 : buckets[0].indexOf(anchor)
        state = { query: state.query, page: index < 0 ? 1 : Math.floor(index / size) + 1, size: size }
        writeSize(size)
        if (sizeInput.value !== String(size)) sizeInput.value = String(size)
        state.size = size
        paint()
      }
      input.addEventListener('input', function () { setQuery(input.value) })
      input.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape' || state.query === '') return
        event.preventDefault()
        setQuery('')
      })
      clear.addEventListener('click', function () { setQuery('') })

      /** Rebuild the page buttons only when the page layout changed. */
      var stamp = ''
      var paintPager = function (view) {
        var next = view.page + '/' + view.pages
        if (next === stamp) return
        stamp = next
        buttons.replaceChildren()
        var step = function (label, face, target, disabled) {
          var button = pagerButton(label, face, undefined, function () { if (!disabled) setPage(target) })
          button.disabled = disabled
          return button
        }
        buttons.append(
          step(text('pager.first'), '\u00ab', 1, view.page <= 1),
          step(text('pager.previous'), '\u2039', view.page - 1, view.page <= 1),
        )
        for (var page of pageNumbers(view.page, view.pages)) {
          var current = page === view.page
          var label = current ? text('pager.pageCurrent', { page: page }) : text('pager.page', { page: page })
          var button = pagerButton(label, String(page), current ? cx.pagerCurrent : undefined, undefined)
          if (current) button.setAttribute('aria-current', 'page')
          else button.addEventListener('click', (function (target) {
            return function () { setPage(target) }
          })(page))
          buttons.append(button)
        }
        buttons.append(
          step(text('pager.next'), '\u203a', view.page + 1, view.page >= view.pages),
          step(text('pager.last'), '\u00bb', view.pages, view.page >= view.pages),
        )
      }

      var write = function (element, value) {
        if (element.textContent !== value) element.textContent = value
      }
      var paint = function () {
        var view = applyView(group, foot, state.query, state.page, state.size)
        // The view clamps the page when the count shrinks. Keep both the state
        // and the stored value in step so a later reload starts on a page that
        // actually exists, after any change (search, size or explicit page).
        state.page = view.page
        writePage(view.page)
        var placeholder = text('installed.search')
        if (input.placeholder !== placeholder) input.placeholder = placeholder
        var label = text('installed.searchLabel')
        if (input.getAttribute('aria-label') !== label) input.setAttribute('aria-label', label)
        var clearLabel = text('installed.clear')
        if (clear.getAttribute('aria-label') !== clearLabel) clear.setAttribute('aria-label', clearLabel)
        clear.hidden = state.query === ''
        write(count, state.query === '' ? '' : text('installed.match', { shown: view.total, total: view.all }))
        var emptyText = state.query === '' || view.total !== 0 ? '' : text('installed.empty', { query: state.query })
        write(empty, emptyText)
        empty.hidden = emptyText === ''
        write(range, text('pager.range', { from: view.from, to: view.to, total: view.total }))
        var hasPager = view.pages > 1
        // One page still shows the range and the cards-per-page field; only the
        // page buttons and the range's rule go, so the block is never a dead line.
        setAttr(pager, 'data-flat', hasPager ? null : '')
        if (foot.hidden !== (emptyText === '' && view.all === 0)) foot.hidden = emptyText === '' && view.all === 0
        if (document.activeElement !== sizeInput && sizeInput.value !== String(state.size)) sizeInput.value = String(state.size)
        write(sizeBefore, text('pager.size'))
        write(sizeAfter, text('pager.sizeUnit'))
        var sizeLabel = text('pager.sizeLabel', { size: state.size })
        if (sizeField.getAttribute('aria-label') !== sizeLabel) sizeField.setAttribute('aria-label', sizeLabel)
        var pagerLabel = text('pager.label')
        if (pager.getAttribute('aria-label') !== pagerLabel) pager.setAttribute('aria-label', pagerLabel)
        paintPager(view)
      }

      // The search block sits under the heading, where the list starts; the
      // range, the cards-per-page field and the pages share one row after the
      // cards inside the group.
      var heading = group.querySelector('[class*="groupHead"]')
      if (heading !== null && heading.nextElementSibling !== holder) heading.after(holder)
      else if (heading === null && group.firstElementChild !== holder) group.prepend(holder)
      paint()
      return {
        repaint: paint,
        dispose: function () {
          holder.remove()
          foot.remove()
        },
      }
    }

    /* ── install ────────────────────────────────────────────────── */

    exports.inject = ['slots', 'locale']

    exports.apply = function apply (ctx) {
      var text = translate(ctx)

      ctx.effect(function () { return ctx.locale.register(NS, { zh: zh, en: en }) }, 'page-tools: dictionaries')

      ctx.effect(function () {
        var style = document.createElement('style')
        style.setAttribute('data-dsh-plugin', NS)
        style.textContent = CSS
        document.head.append(style)
        return function () { style.remove() }
      }, 'page-tools: stylesheet')

      var mounted = new Map()

      function adoptGroup (group) {
        if (group === null || group === undefined || mounted.has(group)) return
        if (group.querySelector(':scope > [' + SLOT_ATTR + ']') !== null) return
        mounted.set(group, mountGroup(group, text))
      }

      /** Take the Installed group the page renders, and drop the one that left. */
      function sweep () {
        for (var group of document.querySelectorAll(GROUP_SELECTOR)) adoptGroup(group)
        for (var stale of Array.from(mounted.keys())) {
          if (stale.isConnected) continue
          mounted.get(stale).dispose()
          mounted.delete(stale)
        }
      }

      ctx.effect(function () {
        if (MutationObserverClass === null) return function () {}
        var queued = false
        // One pass per settled batch of mutations: the pass's own writes land in
        // the next batch, which settles after a second pass because every write
        // is idempotent.
        var observer = new MutationObserverClass(function () {
          if (queued) return
          queued = true
          Promise.resolve().then(function () {
            queued = false
            sweep()
            for (var control of mounted.values()) control.repaint()
          })
        })
        observer.observe(document.body, { childList: true, subtree: true })
        sweep()
        return function () {
          observer.disconnect()
          for (var control of mounted.values()) control.dispose()
          mounted.clear()
        }
      }, 'page-tools: installed group')
    }

    exports.NS = NS
    return module.exports
  },
})
