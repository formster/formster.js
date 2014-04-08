var Api = require('./api'),
  qs = require(qs),
  dom = require('./dom');

module.exports = Signupsio;

function Signupsio(key) {
  if(!(this instanceof Signupsio)) return new Signupsio(key);
  this.api = new Signupsio.Api(key);
}

Signupsio.Api = Api;

Signupsio.auto = function () {
  dom.ready(function () {
    dom.each("form.signupsio", function (form) {
      var href = form.getAttribute('href');
      if(~href.indexOf('?')) {
        var key = qs.parse(href.slice(href.indexOf('?') + 1)).key;
        var signupsio = new Signupsio(key);
        signupsio.visit(document.title);
        signupsio.trackForm(form);
      }
    });
  });
};

Signupsio.prototype.trackForm = function(form) {
  var self = this;
  form.addEventListener('submit', this._onSubmit(form));
  dom.each(form, "input, select, textarea, button", function (el) {
    el.addEventListener('click', self._onClick(el));
  });
};

Signupsio.prototype.visit = function (page) {
  this.api.sendEvent('visit', {
    page_name: page
  });
};

Signupsio.prototype._onClick = function () {
  var self = this;
  return function (e) {
    self.api.sendEvent('click', {
      input_name: this.getAttribute('name'),
      input_type: this.tagName.toLowerCase() === 'input' ? this.getAttribute('type') : this.tagName.toLowerCase()
    });
  };
};

Signupsio.prototype._onSubmit = function (form) {
  var self = this;

  return function (e) {
    e.preventDefault();

    var values = {};

    dom.each(form, "input, select, textarea, button", function (el) {
      dom.val(el, values);
    });

    self.api.sendEvent('signup', values, function (err, signup) {
      if(err) {
        dom.trigger(form, 'signup:error', err);
        dom.addClass(form, 'error');
      } else {
        dom.trigger(form, 'signup', values);
        dom.addClass(form, 'submitted');
      }
    });

  };
};


