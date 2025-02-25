if (document.readyState !== 'loading') {
  console.log('Page is ready, starting the converter!');
  ZeeCurrencyConverter();
} else {
  document.addEventListener('DOMContentLoaded', function () {
    console.log('The page is taking forever to load..');
    ZeeCurrencyConverter();
  });
}

function ZeeCurrencyConverter() {
  // Fetch the current conversion rate for the selected currency
  async function getConversionRate(baseCurrency, targetCurrency) {
    try {
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      return data.rates[targetCurrency];
    } catch (error) {
      console.error('Failed to fetch conversion rate:', error);
      showToast('Failed to fetch conversion rate. Please try again later.');
      return null;
    }
  }

  // Format price with spaces as thousand separators
  function formatPrice(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  // Show a toast message
  function showToast(message) {
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
    toastContainer.style.zIndex = '9999';

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.role = 'alert';
    toast.ariaLive = 'assertive';
    toast.ariaAtomic = 'true';

    const toastHeader = document.createElement('div');
    toastHeader.className = 'toast-header';
    toastHeader.innerHTML = `
      <strong class="me-auto">Price Converter</strong>
      <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
    `;

    const toastBody = document.createElement('div');
    toastBody.className = 'toast-body';
    toastBody.innerText = message;

    toast.appendChild(toastHeader);
    toast.appendChild(toastBody);
    toastContainer.appendChild(toast);
    document.body.appendChild(toastContainer);

    const bootstrapToast = new bootstrap.Toast(toast);
    bootstrapToast.show();
  }

  // Convert prices on the page
  async function convertPrices() {
    const baseCurrency = 'PLN';
    const targetCurrency = await getUserPreference('targetCurrency', 'CZK');
    const conversionRate = await getConversionRate(baseCurrency, targetCurrency);
    if (!conversionRate) {
      console.error('Failed to retrieve conversion rates!');
      return;
    }

    replaceElements(conversionRate, baseCurrency, targetCurrency);
  }

  // Replace elements with converted prices
  function replaceElements(conversionRate, baseCurrency, targetCurrency) {
    // Query price elements for Otomoto ad details
    const priceElementsOtomotoDetail = document.querySelectorAll('.offer-price__number, .zee_price_element');

    // Query price elements for Otomoto search list
    const priceElementsOtomotoList = Array.from(document.querySelectorAll('div')).filter(div => {
      const h3 = div.querySelector('h3');
      const p = div.querySelector('p');
      return h3 && p && (p.innerText.trim() === 'PLN' || p.innerText.trim() === targetCurrency);
    });

    // Query price elements for AutoScout24
    const priceElementsAutoScout24 = document.querySelectorAll('[class*="PriceInfo"], .zee_price_element');

    const priceElements = [...priceElementsOtomotoDetail, ...priceElementsAutoScout24];

    // Handle Otomoto search list separately
    priceElementsOtomotoList.forEach((priceElement) => {
      const priceNumberElement = priceElement.querySelector('h3');
      const priceCurrencyElement = priceElement.querySelector('p');

      if (priceNumberElement && priceCurrencyElement && (priceCurrencyElement.innerText.trim() === baseCurrency || priceCurrencyElement.innerText.trim() === targetCurrency)) {
        const originalPriceText = priceNumberElement.getAttribute('data-original-price') || priceNumberElement.innerText;
        priceNumberElement.setAttribute('data-original-price', originalPriceText);

        const pricePLN = parseFloat(originalPriceText.replace(/[^\d.-]/g, ''));
        const priceConverted = Math.round(pricePLN * conversionRate);
        const formattedPrice = formatPrice(priceConverted);
        priceNumberElement.innerText = `${formattedPrice} ${targetCurrency}`;

        // Add custom classes
        priceElement.classList.add('zee_currency_element');
        priceNumberElement.classList.add('zee_price_element');

        // Remove the original currency label
        priceCurrencyElement.remove();

        // Find the financing link and replace it with the original price
        const financingLink = priceElement.closest('section')?.querySelector('a[href*="finansowanie/redirect/listing-ad-card-entrypoint"]');
        if (financingLink) {
          const originalPriceElement = document.createElement('h4');
          originalPriceElement.style.fontSize = 'smaller';
          originalPriceElement.style.color = 'grey';
          originalPriceElement.innerText = `Original price: ${originalPriceText} ${baseCurrency}`;
          financingLink.replaceWith(originalPriceElement);
        }

        console.log(`Converted ${pricePLN} PLN to ${formattedPrice} ${targetCurrency}`);
      }
    });

    // Handle other price elements
    priceElements.forEach((priceElement) => {
      const originalPriceText = priceElement.getAttribute('data-original-price') || priceElement.innerText;
      priceElement.setAttribute('data-original-price', originalPriceText);

      const pricePLN = parseFloat(originalPriceText.replace(/[^\d.-]/g, ''));
      const priceConverted = Math.round(pricePLN * conversionRate);
      const formattedPrice = formatPrice(priceConverted);
      priceElement.innerText = `${formattedPrice} ${targetCurrency}`;

      // Add custom classes
      priceElement.classList.add('zee_currency_element');
      priceElement.classList.add('zee_price_element');

      // Remove the original currency label in the ad detail view
      const currencyElement = priceElement.closest('.offer-price__currency');
      if (currencyElement) {
        currencyElement.remove();
      } else {
        removeElementsByClass('offer-price__currency');
      }

      // Replace <a> tag with <h4> containing the original price for Otomoto
      const linkElement = priceElement.closest('section')?.querySelector('a[href*="finansowanie/redirect/listing-ad-card-entrypoint"]');
      const originalPriceElement = document.createElement('h4');
      originalPriceElement.classList.add('text-dark');
      originalPriceElement.style.fontSize = 'smaller';
      originalPriceElement.style.color = 'grey';
      originalPriceElement.innerText = `Original price: ${originalPriceText} ${baseCurrency}`;
      if (linkElement) {
        linkElement.replaceWith(originalPriceElement);
      }

      // Replace the "Potrzebujesz finansowania?" element with the original price
      let financingElement = getElementsByText('Potrzebujesz finansowania?', 'p');
      if (financingElement.length > 1) {
        for (let i = 0; i < financingElement.length; i++) {
          financingElement[i].replaceWith(originalPriceElement.cloneNode(true));
        }
      } else if (financingElement.length === 1) {
        financingElement[0].replaceWith(originalPriceElement);
      }

      console.log(`Converted ${pricePLN} PLN to ${formattedPrice} ${targetCurrency}`);
    });
  }

  function getElementsByText(str, tag) {
    let value = Array.prototype.slice.call(document.getElementsByTagName(tag)).filter(el => el.textContent.trim() === str.trim());
    return value;
  }

  function removeElementsByClass(className) {
    const elements = document.getElementsByClassName(className);
    while (elements.length > 0) {
      elements[0].parentNode.removeChild(elements[0]);
    }
  }

  // Get user preference from storage
  function getUserPreference(key, defaultValue) {
    return new Promise((resolve) => {
      chrome.storage.sync.get([key], (result) => {
        resolve(result[key] !== undefined ? result[key] : defaultValue);
      });
    });
  }

  // Inject currency selector into the page
  function injectCurrencySelector() {
    console.log('Injecting currency selector widget...');
    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'currency-selector-container';
    selectorContainer.style.position = 'fixed';
    selectorContainer.style.top = '10px';
    selectorContainer.style.right = '10px';
    selectorContainer.style.zIndex = '9999';
    selectorContainer.style.backgroundColor = 'white';
    selectorContainer.style.padding = '10px';
    selectorContainer.style.border = '1px solid #ccc';
    selectorContainer.style.borderRadius = '5px';
    selectorContainer.style.transition = 'opacity 0.5s, right 0.5s';

    const label = document.createElement('label');
    label.innerText = 'Select currency:';
    label.style.marginRight = '10px';

    const select = document.createElement('select');
    select.className = 'form-select';
    select.innerHTML = `
      <option value="CZK">CZK</option>
      <option value="EUR">EUR</option>
      <option value="USD">USD</option>
      <option value="PLN">PLN</option>
      <option value="GBP">GBP</option>
    `;

    // Load saved preferences
    getUserPreference('targetCurrency', 'CZK').then((targetCurrency) => {
      select.value = targetCurrency;
    });

    // Save preferences when changed and force element replacement
    select.addEventListener('change', async () => {
      console.log('Currency changed to:', select.value);
      chrome.storage.sync.set({ targetCurrency: select.value }, async () => {
        const baseCurrency = 'PLN';
        const targetCurrency = select.value;
        const conversionRate = await getConversionRate(baseCurrency, targetCurrency);
        if (conversionRate) {
          replaceElements(conversionRate, baseCurrency, targetCurrency);
        }
      });
    });

    const minimizeButton = document.createElement('button');
    minimizeButton.className = 'btn btn-secondary btn-sm';
    minimizeButton.innerHTML = '-';
    minimizeButton.style.marginLeft = '10px';

    minimizeButton.addEventListener('click', () => {
      const isMinimized = selectorContainer.classList.toggle('minimized');
      if (isMinimized) {
        label.style.display = 'none';
        select.style.display = 'none';
        minimizeButton.innerHTML = '+';
        selectorContainer.style.right = '50px';
        selectorContainer.style.opacity = '0.5';
      } else {
        label.style.display = 'inline';
        select.style.display = 'inline';
        minimizeButton.innerHTML = '-';
        selectorContainer.style.right = '10px';
        selectorContainer.style.opacity = '1';
      }
    });

    selectorContainer.addEventListener('mouseenter', () => {
      if (selectorContainer.classList.contains('minimized')) {
        selectorContainer.style.right = '10px';
        selectorContainer.style.opacity = '1';
      }
    });

    selectorContainer.addEventListener('mouseleave', () => {
      if (selectorContainer.classList.contains('minimized')) {
        selectorContainer.style.right = '-50px';
        selectorContainer.style.opacity = '0.5';
      }
    });

    selectorContainer.appendChild(label);
    selectorContainer.appendChild(select);
    selectorContainer.appendChild(minimizeButton);
    document.body.appendChild(selectorContainer);
  }

  // Run the conversion immediately on page load
  convertPrices();
  injectCurrencySelector();

  // Add event listener for clicks on adverts
  document.addEventListener('click', (event) => {
    if (event.target.closest('.ooa-67fgj7')) {
      setTimeout(convertPrices, 1000); // Delay to allow new content to load
    }
  });

  // Observe changes in the search list and update prices dynamically
  function observeSearchList() {
    const searchListContainer = document.querySelector('.search-list-container');
    if (searchListContainer) {
      const observer = new MutationObserver(() => {
        convertPrices();
      });

      observer.observe(searchListContainer, { childList: true, subtree: true });
    }
  }

  observeSearchList();
}