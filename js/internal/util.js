var Utils = {
  getDefaults: function(defaults) {
    for (value in defaults) {
      getURLValue(value, defaults[value]) 
    }
  },
  getURLValue: function(elementID, defaultValue) {
    if ( !!(document.getElementById(elementID)) ) {
      var urlValue = getQueryVariable(elementID);
      if (urlValue.length > 0 ) {
        document.getElementById(elementID).value = urlValue;
      } else {
        document.getElementById(elementID).value = defaultValue;
      }
    }
  },
  getQueryVariable: function(variable) {
      var query = window.location.search.substring(1);
      var vars = query.split('&');
      for (var i = 0; i < vars.length; i++) {
          var pair = vars[i].split('=');
          if (decodeURIComponent(pair[0]) == variable) {
              return decodeURIComponent(pair[1]);
          }
      }
      return '';
  }
}
