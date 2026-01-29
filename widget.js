<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Returns Widget Test</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 40px 20px;
      margin: 0;
    }
  </style>
</head>
<body>

  <div id="returns-widget"></div>

  <script src="https://cdn.jsdelivr.net/gh/oliviermuller/returns-widget@main/widget.js?v=2"></script>
  <script>
    try { 
      ReturnsWidget.init('returns-widget'); 
    } catch(e) { 
      console.error('Widget failed to load:', e); 
    }
  </script>

</body>
</html>
