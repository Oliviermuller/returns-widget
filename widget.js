(function() {
  window.ReturnsWidget = {
    config: {},
    
    init: function(containerId, options) {
      var defaults = {
        storeId: '0199ecbe-946e-76d8-8b9f-20b0e5158413',
        accountId: '0199ecbc-4fdd-7c4a-a060-2e4d21dcca0c',
        token: 'eyJhbGciOiJIUzUxMiJ9.eyJzZXJ2aWNlVXNlcklkIjoiMDE5YTBiMzctOTUzNS03MzBiLTgyZjctZWY4Y2FiMjA1NjY3IiwiYWN0aW9uVHlwZSI6IkFQSV9LRVkiLCJuYW1lIjoiUUxTIGludGVncmF0aW9uIiwidHlwZSI6ImFjY291bnQifQ.nE1wNcFi9RMKq7E6-NG5UT7RIDhOgA8ADyZk4MO_DDZ9rPFmhR_gTA_3BtDrSD-6yzmJ0lm7LbHhSHTdZaNg5A',
        lang: 'en'
      };
      this.config = Object.assign({}, defaults, options);
      
      this._loadDependencies(function() {
        ReturnsWidget._render(containerId);
      });
    },

    _loadDependencies: function(callback) {
      var loaded = 0;
      var total = 3;
      var check = function() { if (++loaded === total) callback(); };

      var react = document.createElement('script');
      react.src = 'https://unpkg.com/react@18/umd/react.production.min.js';
      react.onload = function() {
        var reactDom = document.createElement('script');
        reactDom.src = 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js';
        reactDom.onload = check;
        document.head.appendChild(reactDom);
      };
      document.head.appendChild(react);

      var tw = document.createElement('script');
      tw.src = 'https://cdn.tailwindcss.com';
      tw.onload = check;
      document.head.appendChild(tw);

      var style = document.createElement('style');
      style.textContent = '.returns-widget{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}';
      document.head.appendChild(style);
      check();
    },

    _render: function(containerId) {
      var container = document.getElementById(containerId);
      if (!container) return console.error('ReturnsWidget: Container not found');
      
      var cfg = this.config;
      var PROXY = 'https://corsproxy.io/?';
      var API = 'https://core.returnista.com/api/v0';
      var e = React.createElement;
      var useState = React.useState;

      var Check = function() {
        return e('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }, e('polyline', { points: '20 6 9 17 4 12' }));
      };

      function Widget() {
        var _step = useState('email'), step = _step[0], setStep = _step[1];
        var _email = useState(''), email = _email[0], setEmail = _email[1];
        var _name = useState(''), name = _name[0], setName = _name[1];
        var _loading = useState(false), loading = _loading[0], setLoading = _loading[1];
        var _error = useState(''), error = _error[0], setError = _error[1];
        var _purchases = useState([]), purchases = _purchases[0], setPurchases = _purchases[1];
        var _selected = useState({}), selected = _selected[0], setSelected = _selected[1];
        var _reasons = useState({}), reasons = _reasons[0], setReasons = _reasons[1];
        var _resolutions = useState({}), resolutions = _resolutions[0], setResolutions = _resolutions[1];
        var _shipping = useState(null), shipping = _shipping[0], setShipping = _shipping[1];
        var _consumerId = useState(null), consumerId = _consumerId[0], setConsumerId = _consumerId[1];

        var auth = 'Bearer ' + cfg.token;

        var fetchConsumer = function() {
          setLoading(true); setError('');
          var url = PROXY + encodeURIComponent(API + '/store/' + cfg.storeId + '/consumer/by-identity?email=' + encodeURIComponent(email));
          fetch(url, { method: 'POST', headers: { 'Authorization': auth, 'Content-Type': 'application/json' } })
            .then(function(r) { if (!r.ok) throw new Error('No orders found'); return r.json(); })
            .then(function(data) {
              if (data.id) {
                setConsumerId(data.id);
                if (data.name) setName(data.name);
                return fetch(PROXY + encodeURIComponent(API + '/consumer/' + data.id + '/purchases'), { headers: { 'Authorization': auth } });
              }
            })
            .then(function(r) { return r.json(); })
            .then(function(data) { setPurchases(data.data || []); setStep('items'); })
            .catch(function(err) { setError(err.message); })
            .finally(function() { setLoading(false); });
        };

        var submit = function() {
          setLoading(true); setError('');
          var items = purchases.filter(function(p) { return selected[p.purchaseId]; });
          var payload = {
            consumerId: consumerId,
            payload: {
              packageCount: 1, skipNotifyConsumer: false, shippingOptionId: shipping, reason: 'RequestedByMerchant',
              selectedPurchases: items.map(function(p) { return { purchaseId: p.purchaseId, returnReasonId: reasons[p.purchaseId], resolutionType: resolutions[p.purchaseId], orderNumber: (p.order && p.order.orderNumber) || '' }; })
            },
            customerEmail: email, customerName: name || email, customerReference: (items[0] && items[0].order && items[0].order.orderNumber) || ''
          };
          var url = PROXY + encodeURIComponent(API + '/account/' + cfg.accountId + '/consumer/' + consumerId + '/return-order/new');
          fetch(url, { method: 'POST', headers: { 'Authorization': auth, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            .then(function(r) { if (!r.ok) throw new Error('Failed'); setStep('done'); })
            .catch(function(err) { setError(err.message); })
            .finally(function() { setLoading(false); });
        };

        var reset = function() { setStep('email'); setPurchases([]); setSelected({}); setReasons({}); setResolutions({}); setShipping(null); setError(''); };
        var selItems = purchases.filter(function(p) { return selected[p.purchaseId]; });
        var shipOpts = (selItems[0] && selItems[0].shippingOptions) || [];
        var canContinue = selItems.length > 0 && selItems.every(function(p) { return reasons[p.purchaseId] && resolutions[p.purchaseId]; });
        var total = selItems.reduce(function(s, p) { return s + parseFloat((p.units && p.units[0] && p.units[0].paidAmount && p.units[0].paidAmount.value) || 0); }, 0);
        var steps = ['email', 'items', 'shipping', 'done'];
        var stepIdx = steps.indexOf(step);

        return e('div', { className: 'returns-widget w-full max-w-lg mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden' },
          e('div', { className: 'px-5 py-4 border-b border-gray-100 bg-gray-50' },
            e('div', { className: 'flex items-center gap-3' },
              steps.map(function(s, i) {
                return e('div', { key: s, className: 'flex items-center gap-2' },
                  e('div', { className: 'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ' + (step === s ? 'bg-gray-900 text-white' : stepIdx > i ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500') }, stepIdx > i ? e(Check) : i + 1),
                  i < 3 ? e('div', { className: 'w-8 h-0.5 ' + (stepIdx > i ? 'bg-green-500' : 'bg-gray-200') }) : null
                );
              })
            )
          ),
          e('div', { className: 'p-5' },
            error ? e('div', { className: 'mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm' }, error) : null,

            step === 'email' ? e('div', null,
              e('h2', { className: 'text-lg font-semibold text-gray-900 mb-1' }, 'Start your return'),
              e('p', { className: 'text-sm text-gray-500 mb-4' }, 'Enter your email to find your orders'),
              e('input', { type: 'email', value: email, onChange: function(ev) { setEmail(ev.target.value); }, placeholder: 'you@example.com', className: 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900', onKeyDown: function(ev) { if (ev.key === 'Enter' && email) fetchConsumer(); } }),
              e('button', { onClick: fetchConsumer, disabled: loading || !email, className: 'w-full mt-3 px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed' }, loading ? 'Finding...' : 'Continue')
            ) : null,

            step === 'items' ? e('div', null,
              e('h2', { className: 'text-lg font-semibold text-gray-900 mb-1' }, 'Select items'),
              e('p', { className: 'text-sm text-gray-500 mb-4' }, 'Choose items to return'),
              e('div', { className: 'space-y-3 max-h-80 overflow-y-auto' },
                purchases.map(function(item) {
                  var ok = item.units && item.units[0] && item.units[0].returnable === 'yes';
                  var sel = selected[item.purchaseId];
                  var price = item.units && item.units[0] && item.units[0].paidAmount && item.units[0].paidAmount.value;
                  var availRes = (item.units && item.units[0] && item.units[0].availableResolutions) || [];
                  return e('div', { key: item.purchaseId, className: 'border rounded-lg overflow-hidden ' + (sel ? 'border-gray-900' : 'border-gray-200') + (!ok ? ' opacity-50' : '') },
                    e('div', { className: 'flex gap-3 p-3' + (ok ? ' cursor-pointer hover:bg-gray-50' : ''), onClick: function() { if (ok) setSelected(function(p) { var n = {}; for (var k in p) n[k] = p[k]; n[item.purchaseId] = !p[item.purchaseId]; return n; }); } },
                      e('div', { className: 'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ' + (sel ? 'bg-gray-900 border-gray-900 text-white' : 'border-gray-300') }, sel ? e(Check) : null),
                      e('img', { src: item.product && item.product.thumbnailUrl, className: 'w-12 h-12 rounded object-cover bg-gray-100' }),
                      e('div', { className: 'flex-1 min-w-0' },
                        e('p', { className: 'text-sm font-medium text-gray-900 truncate' }, item.product && item.product.name),
                        e('p', { className: 'text-xs text-gray-500' }, item.order && item.order.orderNumber)
                      ),
                      e('p', { className: 'text-sm font-medium text-gray-900' }, '€' + price)
                    ),
                    sel ? e('div', { className: 'px-3 pb-3 pt-2 border-t border-gray-100 bg-gray-50 space-y-3' },
                      e('div', null,
                        e('p', { className: 'text-xs font-medium text-gray-700 mb-2' }, 'Reason'),
                        e('div', { className: 'flex flex-wrap gap-1.5' },
                          (item.returnReasons || []).sort(function(a, b) { return a.position - b.position; }).map(function(r) {
                            return e('button', { key: r.returnReason.id, onClick: function() { setReasons(function(p) { var n = {}; for (var k in p) n[k] = p[k]; n[item.purchaseId] = r.returnReason.id; return n; }); }, className: 'px-2.5 py-1 text-xs rounded-full border ' + (reasons[item.purchaseId] === r.returnReason.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700') }, r.returnReason.description);
                          })
                        )
                      ),
                      e('div', null,
                        e('p', { className: 'text-xs font-medium text-gray-700 mb-2' }, 'Refund method'),
                        e('div', { className: 'flex gap-2' },
                          availRes.map(function(res) {
                            return e('button', { key: res, onClick: function() { setResolutions(function(p) { var n = {}; for (var k in p) n[k] = p[k]; n[item.purchaseId] = res; return n; }); }, className: 'flex-1 px-3 py-2 text-xs rounded-lg border ' + (resolutions[item.purchaseId] === res ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700') }, res === 'Refund' ? 'Original payment' : 'Store credit');
                          })
                        )
                      )
                    ) : null
                  );
                })
              ),
              selItems.length > 0 ? e('div', { className: 'mt-4 pt-4 border-t border-gray-200 flex items-center justify-between' },
                e('p', { className: 'text-sm text-gray-600' }, selItems.length + ' item' + (selItems.length > 1 ? 's' : '') + ' · ', e('span', { className: 'font-medium' }, '€' + total.toFixed(2))),
                e('button', { onClick: function() { setStep('shipping'); }, disabled: !canContinue, className: 'px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed' }, 'Continue')
              ) : null
            ) : null,

            step === 'shipping' ? e('div', null,
              e('h2', { className: 'text-lg font-semibold text-gray-900 mb-1' }, 'Return method'),
              e('p', { className: 'text-sm text-gray-500 mb-4' }, 'Choose how to send your return'),
              e('div', { className: 'space-y-2 mb-4' },
                shipOpts.sort(function(a, b) { return a.position - b.position; }).map(function(opt) {
                  return e('button', { key: opt.id, onClick: function() { setShipping(opt.id); }, className: 'w-full flex items-center gap-3 p-3 rounded-lg border text-left ' + (shipping === opt.id ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300') },
                    e('img', { src: opt.logoUrl, className: 'w-10 h-10 rounded object-contain bg-white border border-gray-100 p-1' }),
                    e('div', { className: 'flex-1' },
                      e('p', { className: 'text-sm font-medium text-gray-900' }, opt.service),
                      e('p', { className: 'text-xs text-gray-500' }, opt.printerRequired ? 'Print label' : 'QR code')
                    ),
                    e('p', { className: 'text-sm font-medium text-gray-900' }, parseFloat(opt.price.value) === 0 ? 'Free' : '€' + opt.price.value),
                    e('div', { className: 'w-4 h-4 rounded-full border-2 flex items-center justify-center ' + (shipping === opt.id ? 'border-gray-900' : 'border-gray-300') }, shipping === opt.id ? e('div', { className: 'w-2 h-2 rounded-full bg-gray-900' }) : null)
                  );
                })
              ),
              e('div', { className: 'p-3 bg-gray-50 rounded-lg mb-4 flex justify-between text-sm' },
                e('span', { className: 'text-gray-600' }, 'Refund total'),
                e('span', { className: 'font-semibold text-gray-900' }, '€' + total.toFixed(2))
              ),
              e('div', { className: 'flex gap-2' },
                e('button', { onClick: function() { setStep('items'); }, className: 'px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50' }, 'Back'),
                e('button', { onClick: submit, disabled: loading || !shipping, className: 'flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed' }, loading ? 'Submitting...' : 'Submit return')
              )
            ) : null,

            step === 'done' ? e('div', { className: 'text-center py-4' },
              e('div', { className: 'w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4' },
                e('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: '#22c55e', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }, e('polyline', { points: '20 6 9 17 4 12' }))
              ),
              e('h2', { className: 'text-lg font-semibold text-gray-900 mb-1' }, 'Return submitted'),
              e('p', { className: 'text-sm text-gray-500 mb-4' }, "You'll receive shipping instructions by email"),
              e('button', { onClick: reset, className: 'px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50' }, 'Start new return')
            ) : null
          )
        );
      }

      ReactDOM.createRoot(container).render(e(Widget));
    }
  };
})();
