var Api = require('./api'),
  qs = require('qs'),
  dom = require('./dom');

module.exports = Formster;

function Formster(key) {
  if(!(this instanceof Formster)) return new Formster(key);
  this.api = new Formster.Api(key);
}

Formster.Api = Api;

Formster._forms = [];
Formster._instances = {};

Formster.auto = function () {
  dom.ready(function () {
    dom.each("form.formster", function (form) {
      var href,
        key,
        formster;

      // pull the url from the form
      href = form.getAttribute('action');

      if(href && ~href.indexOf('?')) {

        // get the key from the query string
        key = qs.parse(href.slice(href.indexOf('?') + 1)).key;

        if(key) {

          if(~Formster._forms.indexOf(form)) {
            // we're already tracking this form
            return;
          }

          // don't track forms more than once
          Formster._forms.push(form);

          // create a new instance for this form
          formster = new Formster(key);

          // record a visit to the page
          formster.visit(document.title);

          // keep an eye on the form for IX
          formster.trackForm(form);
        }
      }
    });
  });
};

Formster.prototype.trackForm = function(form) {
  var self = this;
  form.addEventListener('submit', this._onSubmit(form));
  dom.each(form, "input, select, textarea, button", function (el) {
    el.addEventListener('click', self._onClick(el));
  });
};

Formster.prototype.visit = function (page) {
  this.api.sendEvent('visit', {
    page_name: page
  });
};

Formster.prototype._onClick = function () {
  var self = this;
  return function (e) {
    self.api.sendEvent('click', {
      input_name: this.getAttribute('name'),
      input_type: this.tagName.toLowerCase() === 'input' ? this.getAttribute('type') : this.tagName.toLowerCase()
    });
  };
};

Formster.prototype._onSubmit = function (form) {
  var self = this;

  return function (e) {
    e.preventDefault();

    dom.addClass(form, 'formster-submitting');

    var values = {};

    dom.each(form, "input, select, textarea, button", function (el) {
      dom.val(el, values);
    });

    self.api.sendEvent('signup', values, function (err, signup) {
      dom.removeClass(form, 'formster-submitting');
      if(err) {
        dom.trigger(form, 'signup:error', err);
        dom.addClass(form, 'formster-error');
      } else {
        dom.trigger(form, 'signup', values);
        dom.addClass(form, 'formster-submitted');
      }
    });

  };
};

// automatically call `Formster.auto`. If it's not desired for forms to be scanned automatically, don't class them with `formster`.
Formster.auto();
