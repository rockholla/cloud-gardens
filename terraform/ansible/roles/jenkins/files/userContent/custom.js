document.addEventListener("DOMContentLoaded", function() {

  // This makes sure that we can access both the selected repo and branch in the resulting $RepoBranch variable
  var firstRepoBranchSelect = document.querySelector('.RepoBranch select');
  if (firstRepoBranchSelect) {
    firstRepoBranchSelect.addEventListener('change', function (event) {
      // find the last visible dropdown, that's our branch, alter the values
      var allSelects = document.querySelectorAll('.RepoBranch select');
      var lastSelect;
      for (var i = 0; i < allSelects.length; i++) {
        if (allSelects[i].getAttribute('style').indexOf('display: inline') >= 0) {
          lastSelect = allSelects[i];
        }
      }
      var options = lastSelect.querySelectorAll('option');
      for (var i = 0; i < options.length; i++) {
        options[i].setAttribute('value', firstRepoBranchSelect.value + ':::' + options[i].getAttribute('value'))
      }
    });
  }

});