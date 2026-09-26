// A deliberately tiny fake DOM. Just enough for AB.el() (utils.js) to build real node
// trees in plain Node, with no dependency installed. Not a browser, doesn't need to be.

class FakeNode {
  constructor(tag) {
    this.tagName = tag;
    this.className = '';
    this.textContent = '';
    this.style = {};
    this.children = [];
    this.attrs = {};
    this.listeners = {};
    this.open = false; // <details>
  }
  setAttribute(k, v) { this.attrs[k] = v; }
  // Backed by the same className string a real element uses, so tests that read
  // .className (like querySelector above) see exactly what add/remove produced.
  get classList() {
    const classes = () => this.className.split(' ').filter(Boolean);
    const set = (arr) => { this.className = arr.join(' '); };
    return {
      add: (...names) => set([...new Set([...classes(), ...names])]),
      remove: (...names) => set(classes().filter(c => !names.includes(c))),
      toggle: (name, force) => {
        const has = classes().includes(name);
        const want = force === undefined ? !has : force;
        want ? set([...new Set([...classes(), name])]) : set(classes().filter(c => c !== name));
        return want;
      },
      contains: (name) => classes().includes(name)
    };
  }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  append(...nodes) {
    for (const n of nodes) {
      if (n == null || n === false) continue;
      this.children.push(n);
    }
  }
  querySelector(sel) {
    // Only what tests need: '.class' and 'tag' lookups, one level deep or nested.
    const matches = (n) => {
      if (sel.startsWith('.')) return n.className && n.className.split(' ').includes(sel.slice(1));
      return n.tagName === sel;
    };
    const walk = (n) => {
      for (const c of n.children) {
        if (matches(c)) return c;
        const found = walk(c);
        if (found) return found;
      }
      return null;
    };
    return matches(this) ? this : walk(this);
  }
  querySelectorAll(sel) {
    const out = [];
    const matches = (n) => n.className && n.className.split(' ').includes(sel.replace('.', ''));
    const walk = (n) => { for (const c of n.children) { if (matches(c)) out.push(c); walk(c); } };
    walk(this);
    return out;
  }
  // Flattens all textContent in the subtree, mirroring innerText closely enough for assertions.
  get innerText() {
    let s = this.textContent || '';
    for (const c of this.children) s += (typeof c === 'string' ? c : c.innerText || '');
    return s;
  }
}

function createElement(tag) { return new FakeNode(tag); }
function createTextNode(text) { const n = new FakeNode('#text'); n.textContent = String(text); return n; }

module.exports = { createElement, createTextNode, FakeNode };
