exports.each = each;
exports.addClass = addClass;
exports.removeClass = removeClass;
exports.ready = ready;
exports.val = val;
exports.trigger = trigger;

function each(el, selector, fn) {
  if(arguments.length < 3) {
    fn = selector;
    selector = el;
    el = document;
  }

  Array.prototype.forEach.call(el.querySelectorAll(selector), fn); 
}

function addClass(el, className) {
  if (el.classList) {
    el.classList.add(className);
  } else if(!~el.className.split(' ').indexOf(className)) {
    el.className += ' ' + className;
  }
}

function removeClass(el, className) {
  el.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
}

function ready(fn) {
  document.addEventListener('DOMContentLoaded', fn);
}

function val(el, values) {
  if(!el.getAttribute('name')) return values;

  if('input' === el.tagName) {
    if('radio' === el.getAttribute('type')) {
      values[el.getAttribute('name')] = el.value;
    }
    if('checkbox' === el.getAttribute('type')) {
      values[el.getAttribute('name')] = values[el.getAttribute('name')] || [];
      values[el.getAttribute('name')].push(el.value);
    }
  }

  values[el.getAttribute('name')] = el.value;

  return values;
}

function trigger(el, evt, data) {
  var event;

  if (window.CustomEvent) {
    event = new CustomEvent(evt, {detail: data});
  } else {
    event = document.createEvent('CustomEvent');
    event.initCustomEvent(evt, true, true, data);
  }

  el.dispatchEvent(event);
}
