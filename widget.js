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
      style.textContent = '.returns-widget{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.returns-widget select{appearance:none;background-image:url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e");background-repeat:no-repeat;background-position:right 12px center;background-size:16px}';
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
        var blue = '#0a1e5c';

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

        return e('div', { className: 'returns-widget w-full max-w-xl mx-auto' },
          
          // Header
          e('div', { className: 'text-center mb-6' },
            e('h1', { className: 'text-2xl font-bold mb-2', style: { color: blue } }, 'Returns'),
            e('p', { className: 'text-gray-500 text-sm' }, 
              step === 'email' ? 'Enter your email to find your orders' :
              step === 'items' ? 'Select items to return' :
              step === 'shipping' ? 'Choose your return method' :
              'Return submitted successfully'
            )
          ),

          error ? e('div', { className: 'mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm' }, error) : null,

          // Email Step
          step === 'email' ? e('div', { className: 'bg-white rounded-xl border border-gray-200 p-6' },
            e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Email address'),
            e('input', { 
              type: 'email', 
              value: email, 
              onChange: function(ev) { setEmail(ev.target.value); }, 
              placeholder: 'you@example.com', 
              className: 'w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent mb-4',
              style: { '--tw-ring-color': blue },
              onKeyDown: function(ev) { if (ev.key === 'Enter' && email) fetchConsumer(); } 
            }),
            e('button', { 
              onClick: fetchConsumer, 
              disabled: loading || !email, 
              className: 'w-full px-4 py-3 text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity',
              style: { backgroundColor: blue }
            }, loading ? 'Finding orders...' : 'Find my orders')
          ) : null,

          // Items Step
          step === 'items' ? e('div', null,
            e('div', { className: 'space-y-4 mb-6' },
              purchases.map(function(item) {
                var ok = item.units && item.units[0] && item.units[0].returnable === 'yes';
                var sel = selected[item.purchaseId];
                var price = item.units && item.units[0] && item.units[0].paidAmount && item.units[0].paidAmount.value;
                var availRes = (item.units && item.units[0] && item.units[0].availableResolutions) || [];
                var returnReasons = (item.returnReasons || []).sort(function(a, b) { return a.position - b.position; });
                
                return e('div', { 
                  key: item.purchaseId, 
                  className: 'bg-white rounded-xl border-2 overflow-hidden transition-all ' + (sel ? 'border-blue-900' : 'border-gray-200') + (!ok ? ' opacity-50' : ''),
                  style: sel ? { borderColor: blue } : {}
                },
                  // Product row
                  e('div', { 
                    className: 'flex gap-4 p-4' + (ok ? ' cursor-pointer' : ''), 
                    onClick: function() { if (ok) setSelected(function(p) { var n = {}; for (var k in p) n[k] = p[k]; n[item.purchaseId] = !p[item.purchaseId]; return n; }); } 
                  },
                    e('div', { 
                      className: 'w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-colors',
                      style: sel ? { backgroundColor: blue, borderColor: blue, color: 'white' } : { borderColor: '#d1d5db' }
                    }, sel ? e(Check) : null),
                    e('img', { src: item.product && item.product.thumbnailUrl, className: 'w-16 h-16 rounded-lg object-cover bg-gray-100 flex-shrink-0' }),
                    e('div', { className: 'flex-1 min-w-0' },
                      e('p', { className: 'font-semibold text-gray-900 mb-1' }, item.product && item.product.name),
                      e('p', { className: 'text-sm text-gray-500' }, 'Order: ' + (item.order && item.order.orderNumber))
                    ),
                    e('p', { className: 'font-bold text-lg', style: { color: blue } }, '€' + price)
                  ),
                  
                  // Options (when selected)
                  sel ? e('div', { className: 'px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50 space-y-4' },
                    // Reason dropdown
                    e('div', null,
                      e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Reason for return'),
                      e('select', { 
                        value: reasons[item.purchaseId] || '', 
                        onChange: function(ev) { setReasons(function(p) { var n = {}; for (var k in p) n[k] = p[k]; n[item.purchaseId] = ev.target.value; return n; }); },
                        className: 'w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 bg-white pr-10',
                        style: { '--tw-ring-color': blue }
                      },
                        e('option', { value: '' }, 'Select a reason...'),
                        returnReasons.map(function(r) {
                          return e('option', { key: r.returnReason.id, value: r.returnReason.id }, r.returnReason.description);
                        })
                      )
                    ),
                    // Resolution cards
                    e('div', null,
                      e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Refund method'),
                      e('div', { className: 'grid grid-cols-2 gap-3' },
                        availRes.map(function(res) {
                          var isSelected = resolutions[item.purchaseId] === res;
                          var isCredit = res === 'StoreCredit';
                          return e('button', { 
                            key: res, 
                            onClick: function() { setResolutions(function(p) { var n = {}; for (var k in p) n[k] = p[k]; n[item.purchaseId] = res; return n; }); }, 
                            className: 'relative p-4 rounded-xl border-2 text-left transition-all ' + (isSelected ? 'bg-blue-50' : 'bg-white hover:border-gray-300'),
                            style: isSelected ? { borderColor: blue } : { borderColor: '#e5e7eb' }
                          },
                            isCredit ? e('div', { className: 'absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full' }, '+10%') : null,
                            e('div', { className: 'text-2xl mb-2' }, isCredit ? '🎁' : '💳'),
                            e('p', { className: 'font-semibold text-sm text-gray-900' }, isCredit ? 'Store Credit' : 'Original Payment'),
                            e('p', { className: 'text-xs text-gray-500 mt-1' }, isCredit ? 'Get bonus credit' : 'Refund to card')
                          );
                        })
                      )
                    )
                  ) : null
                );
              })
            ),
            
            // Continue button
            selItems.length > 0 ? e('div', { className: 'bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between' },
              e('div', null,
                e('p', { className: 'text-sm text-gray-500' }, selItems.length + ' item' + (selItems.length > 1 ? 's' : '') + ' selected'),
                e('p', { className: 'font-bold text-lg', style: { color: blue } }, '€' + total.toFixed(2))
              ),
              e('button', { 
                onClick: function() { setStep('shipping'); }, 
                disabled: !canContinue, 
                className: 'px-6 py-3 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90',
                style: { backgroundColor: blue }
              }, 'Continue')
            ) : null
          ) : null,

          // Shipping Step
          step === 'shipping' ? e('div', null,
            e('div', { className: 'space-y-3 mb-4' },
              shipOpts.sort(function(a, b) { return a.position - b.position; }).map(function(opt) {
                var isSelected = shipping === opt.id;
                return e('button', { 
                  key: opt.id, 
                  onClick: function() { setShipping(opt.id); }, 
                  className: 'w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all bg-white ' + (isSelected ? '' : 'hover:border-gray-300'),
                  style: isSelected ? { borderColor: blue, backgroundColor: '#f0f4ff' } : { borderColor: '#e5e7eb' }
                },
                  e('img', { src: opt.logoUrl, className: 'w-12 h-12 rounded-lg object-contain bg-white border border-gray-100 p-1' }),
                  e('div', { className: 'flex-1' },
                    e('p', { className: 'font-semibold text-gray-900' }, opt.service),
                    e('p', { className: 'text-sm text-gray-500' }, opt.printerRequired ? 'Print label at home' : 'QR code - no printer needed')
                  ),
                  e('p', { className: 'font-bold', style: { color: blue } }, parseFloat(opt.price.value) === 0 ? 'Free' : '€' + opt.price.value),
                  e('div', { 
                    className: 'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                    style: isSelected ? { borderColor: blue, backgroundColor: blue } : { borderColor: '#d1d5db' }
                  }, isSelected ? e('div', { className: 'w-2 h-2 rounded-full bg-white' }) : null)
                );
              })
            ),
            
            // Summary
            e('div', { className: 'bg-white rounded-xl border border-gray-200 p-4 mb-4' },
              e('div', { className: 'flex justify-between items-center' },
                e('span', { className: 'text-gray-600' }, 'Refund total'),
                e('span', { className: 'font-bold text-xl', style: { color: blue } }, '€' + total.toFixed(2))
              )
            ),
            
            // Actions
            e('div', { className: 'flex gap-3' },
              e('button', { 
                onClick: function() { setStep('items'); }, 
                className: 'px-6 py-3 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors' 
              }, 'Back'),
              e('button', { 
                onClick: submit, 
                disabled: loading || !shipping, 
                className: 'flex-1 px-6 py-3 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90',
                style: { backgroundColor: blue }
              }, loading ? 'Submitting...' : 'Submit return')
            )
          ) : null,

          // Done Step
          step === 'done' ? e('div', { className: 'bg-white rounded-xl border border-gray-200 p-8 text-center' },
            e('div', { className: 'w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4' },
              e('svg', { width: 32, height: 32, viewBox: '0 0 24 24', fill: 'none', stroke: '#22c55e', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }, e('polyline', { points: '20 6 9 17 4 12' }))
            ),
            e('h2', { className: 'text-xl font-bold mb-2', style: { color: blue } }, 'Return submitted!'),
            e('p', { className: 'text-gray-500 mb-6' }, "You'll receive shipping instructions by email shortly."),
            e('button', { 
              onClick: reset, 
              className: 'px-6 py-3 border-2 rounded-lg text-sm font-semibold transition-colors hover:bg-gray-50',
              style: { borderColor: blue, color: blue }
            }, 'Start new return')
          ) : null
        );
      }

      ReactDOM.createRoot(container).render(e(Widget));
    }
  };
})();
