(function bootstrap(root, factory) {
  'use strict';

  const application = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = application;
  }

  if (root && root.document) {
    application.mount(root);
  }
})(typeof window === 'undefined' ? null : window, () => {
  'use strict';

  const TEST_API_URL =
    '';
  const PROD_API_URL =
    '';
  const TEST_FRONTEND_HOST =
    'disabled.invalid';
  const PROD_FRONTEND_HOSTS = new Set();
  const FRONTEND_MODES = Object.freeze({
    TEST_ENABLED: 'TEST_ENABLED',
    PROD_ENABLED: 'PROD_ENABLED',
    PUBLIC_BLOCKED: 'PUBLIC_BLOCKED',
  });
  const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);
  const PUBLIC_SUBMISSION_MESSAGE =
    'Приём заявок временно недоступен. Мы откроем его после завершения подготовки.';
  const PHOTO_UPLOAD_BASE_URL = TEST_API_URL.replace(/\/applications$/u, '');
  const PHOTO_INITIATE_URL = `${PHOTO_UPLOAD_BASE_URL}/photo-uploads/initiate`;
  const PHOTO_COMPLETE_URL = `${PHOTO_UPLOAD_BASE_URL}/photo-uploads/complete`;
  const FORM_VERSION = 'FORM-2.3';
  const CONSENT_VERSION = 'CONSENT-PD-2.2';
  const POLICY_VERSION = 'PPD-2.2';
  const MULTI_FIELDS = new Set();
  const FORM_FIELDS = ['full_name', 'age', 'gender', 'city', 'visit_krasnodar',
    'phone', 'email', 'profile_or_messenger_url', 'photo_object_id'];
  const FIELD_SET = new Set(FORM_FIELDS);
  const GENDERS = new Set(['Мужчина', 'Женщина']);
  const VISIT_OPTIONS = new Set(['Да, регулярно', 'Да, время от времени', 'Пока не уверен(а)']);
  const CITIES = [
    'Абинск', 'Адыгейск', 'Азов', 'Аксай', 'Алупка', 'Алушта', 'Анапа',
    'Апшеронск', 'Армавир', 'Армянск', 'Астрахань', 'Ахтубинск', 'Батайск',
    'Бахчисарай', 'Белая Калитва', 'Белогорск', 'Белореченск', 'Волгоград',
    'Волгодонск', 'Волжский', 'Геленджик', 'Городовиковск', 'Горячий Ключ',
    'Гуково', 'Гулькевичи', 'Джанкой', 'Донецк', 'Дубовка', 'Евпатория',
    'Ейск', 'Жирновск', 'Зверево', 'Зерноград', 'Знаменск', 'Инкерман',
    'Калач-на-Дону', 'Каменск-Шахтинский', 'Камызяк', 'Камышин', 'Керчь',
    'Константиновск', 'Кореновск', 'Котельниково', 'Котово', 'Краснодар',
    'Красноперекопск', 'Краснослободск', 'Красный Сулин', 'Кропоткин',
    'Крымск', 'Курганинск', 'Лабинск', 'Лагань', 'Ленинск', 'Майкоп',
    'Миллерово', 'Михайловка', 'Морозовск', 'Нариманов', 'Николаевск',
    'Новоаннинский', 'Новокубанск', 'Новороссийск', 'Новочеркасск',
    'Новошахтинск', 'Палласовка', 'Петров Вал', 'Приморско-Ахтарск',
    'Пролетарск', 'Ростов-на-Дону', 'Саки', 'Сальск', 'Севастополь',
    'Семикаракорск', 'Серафимович', 'Симферополь', 'Славянск-на-Кубани',
    'Сочи', 'Старый Крым', 'Судак', 'Суровикино', 'Таганрог', 'Темрюк',
    'Тимашёвск', 'Тихорецк', 'Туапсе', 'Урюпинск', 'Усть-Лабинск',
    'Феодосия', 'Фролово', 'Хадыженск', 'Харабали', 'Цимлянск', 'Шахты',
    'Щёлкино', 'Элиста', 'Ялта',
  ];

  function normalizeHostname(hostname) {
    return typeof hostname === 'string' ? hostname.trim().toLowerCase() : '';
  }

  function isValidProdRuntimeConfig(config) {
    return Boolean(config)
      && typeof config === 'object'
      && config.mode === FRONTEND_MODES.PROD_ENABLED
      && config.prod_api_url === PROD_API_URL;
  }

  function resolveFrontendMode(locationLike = {}, runtimeConfig) {
    const hostname = normalizeHostname(locationLike.hostname);

    if (hostname === TEST_FRONTEND_HOST) {
      return FRONTEND_MODES.TEST_ENABLED;
    }

    if (LOCAL_HOSTNAMES.has(hostname)) {
      const search = typeof locationLike.search === 'string' ? locationLike.search : '';
      if (new URLSearchParams(search).get('test') === 'true') {
        return FRONTEND_MODES.TEST_ENABLED;
      }
    }

    if (PROD_FRONTEND_HOSTS.has(hostname) && isValidProdRuntimeConfig(runtimeConfig)) {
      return FRONTEND_MODES.PROD_ENABLED;
    }

    return FRONTEND_MODES.PUBLIC_BLOCKED;
  }

  function isLocalTestPreview(locationLike = {}) {
    const hostname = normalizeHostname(locationLike.hostname);
    const search = typeof locationLike.search === 'string' ? locationLike.search : '';
    return LOCAL_HOSTNAMES.has(hostname)
      && new URLSearchParams(search).get('test') === 'true';
  }

  function isSubmissionEnabled(mode) {
    return mode === FRONTEND_MODES.TEST_ENABLED || mode === FRONTEND_MODES.PROD_ENABLED;
  }

  function assertSubmissionEnabled(mode) {
    if (!isSubmissionEnabled(mode)) {
      throw new Error('public_submission_blocked');
    }
  }

  function resolveApiUrl(mode, apiUrl) {
    const expected = mode === FRONTEND_MODES.PROD_ENABLED ? PROD_API_URL : TEST_API_URL;
    if (apiUrl !== undefined && apiUrl !== expected) {
      throw new Error('invalid_runtime_api_url');
    }
    return expected;
  }

  function photoEndpoint(apiUrl, suffix) {
    return `${apiUrl.replace(/\/applications$/u, '')}${suffix}`;
  }

  function createIdempotencyKey(randomUUID) {
    if (typeof randomUUID !== 'function') {
      throw new Error('secure_random_uuid_unavailable');
    }
    const uuid = randomUUID();
    const key = `v5-${uuid}`;

    if (key.length < 16 || key.length > 128) {
      throw new Error('invalid_idempotency_key');
    }

    return key;
  }

  function buildPayload(entries) {
    const payload = {};

    for (const field of FORM_FIELDS) {
      payload[field] = MULTI_FIELDS.has(field) ? [] : '';
    }

    for (const [name, rawValue] of entries) {
      if (!FIELD_SET.has(name) && name !== 'personal_data_consent'
        && name !== 'policy_acknowledged') {
        continue;
      }

      if (name === 'personal_data_consent' || name === 'policy_acknowledged') {
        payload[name] = rawValue === true || rawValue === 'true';
      } else if (MULTI_FIELDS.has(name)) {
        payload[name].push(String(rawValue));
      } else {
        payload[name] = String(rawValue).trim();
      }
    }

    payload.personal_data_consent = payload.personal_data_consent === true;
    payload.policy_acknowledged = payload.policy_acknowledged === true;
    payload.phone = normalizeRussianPhone(payload.phone) || payload.phone;
    payload.consent_version = CONSENT_VERSION;
    payload.policy_version = POLICY_VERSION;
    payload.form_version = FORM_VERSION;

    return payload;
  }

  function validateFrontendPayload(payload) {
    if (payload.policy_acknowledged !== true) return 'policy_acknowledged';
    if (payload.personal_data_consent !== true) return 'personal_data_consent';
    for (const name of ['full_name', 'age', 'gender', 'city', 'phone', 'email', 'profile_or_messenger_url']) {
      if (!String(payload[name] || '').trim()) return name;
    }
    const age = Number(payload.age);
    if (!Number.isInteger(age) || age < 25 || age > 52) return 'age';
    if (!GENDERS.has(payload.gender)) return 'gender';
    if (!CITIES.includes(payload.city)) return 'city';
    if (payload.city !== 'Краснодар' && !VISIT_OPTIONS.has(payload.visit_krasnodar)) return 'visit_krasnodar';
    if (payload.city === 'Краснодар' && payload.visit_krasnodar) return 'visit_krasnodar';
    if (!normalizeRussianPhone(payload.phone)) return 'phone';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(payload.email || '')) return 'email';
    if (payload.full_name.length > 120) return 'full_name';
    if (payload.profile_or_messenger_url.length > 500) return 'profile_or_messenger_url';
    if (!/^PHOTO-[A-Za-z0-9_-]{16,120}$/u.test(payload.photo_object_id || '')) return 'photo_object_id';
    return null;
  }

  function normalizeRussianPhone(value) {
    const input = String(value || '').trim();
    if (!input || /[^\d+\s()-]/u.test(input)
      || (input.includes('+') && !/^\+\d/u.test(input))
      || (input.startsWith('+') && !input.startsWith('+7'))
      || (input.match(/\+/gu) || []).length > 1) return null;
    let digits = input.replace(/\D/gu, '');
    if (digits.length === 11) {
      if (!/^[78]/u.test(digits)) return null;
      digits = digits.slice(1);
    }
    return /^\d{10}$/u.test(digits) ? `+7${digits}` : null;
  }

  function responseResult(status, body, key) {
    if (status === 201 || (status === 200 && (body.idempotent_replay === true || body.already_registered === true))) {
      if (typeof body.application_number !== 'string'
        || !/^\d{6,}$/u.test(body.application_number)
        || Number(body.application_number) < 1) {
        return {
          state: 'recoverable_error',
          code: 'application_number_unavailable',
          key,
        };
      }
      return {
        state: 'success',
        key,
        applicationId: body.application_id || '',
        applicationNumber: body.application_number,
        alreadyRegistered: body.already_registered === true,
      };
    }

    if (status === 409) {
      return {
        state: 'recoverable_error',
        code: body.error?.code || 'idempotency_conflict',
        key,
      };
    }

    if (status === 422) {
      return {
        state: 'validation_error',
        code: body.error?.code || 'validation_error',
        key,
      };
    }

    if (status === 415) {
      return {
        state: 'recoverable_error',
        code: 'unsupported_media_type',
        key,
      };
    }

    if (status === 503) {
      return {
        state: 'recoverable_error',
        code: body.error?.code || 'temporarily_unavailable',
        key,
      };
    }

    return {
      state: 'recoverable_error',
      code: 'unexpected_response',
      key,
    };
  }

  function createPhotoUploadAdapter() { return createLocalPreviewPhotoUploadAdapter(); }
  function createMountedPhotoUploadAdapter() { return createLocalPreviewPhotoUploadAdapter(); }

  function createLocalPreviewPhotoUploadAdapter() {
    return async function uploadPhoto() {
      return {photo_object_id: 'PHOTO-LOCAL-PREVIEW-000000000001'};
    };
  }

  function createLocalPreviewFetch() {
    return async function localPreviewFetch() {
      return {
        status: 201,
        ok: true,
        json: async () => ({
          application_id: 'LOCAL-PREVIEW',
          application_number: '000001',
        }),
      };
    };
  }

  function createSubmitController({
    fetchImpl,
    randomUUID,
    mode = FRONTEND_MODES.PUBLIC_BLOCKED,
    apiUrl,
    timeoutMs = 15000,
    AbortControllerImpl,
  }) {
    const resolvedApiUrl = resolveApiUrl(mode, apiUrl);
    let idempotencyKey = isSubmissionEnabled(mode)
      ? createIdempotencyKey(randomUUID)
      : null;
    let state = 'idle';
    let inFlight = null;

    async function performSubmit(payload) {
      state = 'submitting';
      const abortController = AbortControllerImpl
        ? new AbortControllerImpl()
        : null;
      const timeout = abortController
        ? setTimeout(() => abortController.abort(), timeoutMs)
        : null;

      try {
        const response = await fetchImpl(resolvedApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify(payload),
          ...(abortController ? { signal: abortController.signal } : {}),
        });
        const body = await response.json().catch(() => ({}));
        const result = responseResult(response.status, body, idempotencyKey);
        state = result.state;
        return result;
      } catch (error) {
        state = 'recoverable_error';
        return {
          state,
          code: error?.name === 'AbortError' ? 'timeout' : 'network_error',
          uncertain: true,
          key: idempotencyKey,
        };
      } finally {
        if (timeout !== null) {
          clearTimeout(timeout);
        }
      }
    }

    function submit(payload) {
      if (!isSubmissionEnabled(mode)) {
        state = 'blocked';
        return Promise.resolve({
          state,
          code: 'public_submission_blocked',
        });
      }

      if (inFlight) {
        return inFlight;
      }

      inFlight = performSubmit(payload).finally(() => {
        inFlight = null;
      });
      return inFlight;
    }

    function startNewSession() {
      if (!isSubmissionEnabled(mode) || inFlight) {
        return null;
      }

      idempotencyKey = createIdempotencyKey(randomUUID);
      state = 'idle';
      return idempotencyKey;
    }

    return {
      submit,
      startNewSession,
      getIdempotencyKey: () => idempotencyKey,
      getState: () => state,
      isSubmitting: () => inFlight !== null,
    };
  }

  function mountCityAutocomplete(root, input, cities) {
    const document = root.document;
    const wrapper = input.closest('.city-autocomplete');
    const list = wrapper.querySelector('[role="listbox"]');
    const results = wrapper.querySelector('[role="status"]');
    let matches = [];
    let active = -1;
    function close() {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    }
    function highlight(index) {
      active = index;
      [...list.children].forEach((option, i) => option.setAttribute('aria-selected', String(i === active)));
      const option = list.children[active];
      if (option) {
        input.setAttribute('aria-activedescendant', option.id);
        option.scrollIntoView({block: 'nearest'});
      }
    }
    function choose(index) {
      if (!matches[index]) return;
      input.value = matches[index];
      input.classList.remove('is-invalid');
      input.setCustomValidity('');
      close();
      input.dispatchEvent(new root.Event('change', {bubbles: true}));
    }
    function open() {
      const query = input.value.trim().toLocaleLowerCase('ru');
      matches = cities.filter(city => city.toLocaleLowerCase('ru').includes(query));
      list.replaceChildren();
      active = -1;
      input.removeAttribute('aria-activedescendant');
      matches.forEach((city, i) => {
        const option = document.createElement('li');
        option.id = 'city-option-' + i;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', 'false');
        option.textContent = city;
        option.addEventListener('pointerdown', event => event.preventDefault());
        option.addEventListener('click', () => choose(i));
        list.append(option);
      });
      results.textContent = matches.length ? '' : 'Город не найден. Выберите город из списка.';
      list.hidden = matches.length === 0;
      input.setAttribute('aria-expanded', String(matches.length > 0));
    }
    input.addEventListener('focus', open);
    input.addEventListener('input', () => {
      input.setCustomValidity(cities.includes(input.value) ? '' : 'Выберите город из списка.');
      input.dispatchEvent(new root.Event('change', {bubbles: true}));
      open();
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (list.hidden) open();
        if (matches.length) highlight(event.key === 'ArrowDown'
          ? (active + 1) % matches.length : (active <= 0 ? matches.length : active) - 1);
      } else if (event.key === 'Enter' && !list.hidden) {
        event.preventDefault();
        choose(active < 0 ? 0 : active);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        close();
      } else if (event.key === 'Tab') close();
    });
    input.addEventListener('blur', close);
    document.addEventListener('pointerdown', event => { if (!wrapper.contains(event.target)) close(); });
    input.form.addEventListener('reset', close);
  }

  function mount(root) {
    const document = root.document;
    const form = document.querySelector('#application-v5');
    if (!form) return;
    // FORM-2.3 must never reach FORM-2.2 intake, including photo initiation.
    const isLocalPreview = Boolean(document.querySelector('meta[name="gravitation-visual-preview"]'))
      || isLocalTestPreview(root.location);
    const availability = document.querySelector('#application-availability');
    availability.textContent = isLocalPreview
      ? 'Просмотр формы: данные и фотография никуда не отправляются.'
      : 'Приём новой версии заявок пока недоступен.';
    form.dataset.mode = isLocalPreview ? 'LOCAL_PREVIEW' : FRONTEND_MODES.PUBLIC_BLOCKED;
    const city = form.elements.city;
    const visit = form.elements.visit_krasnodar;
    const photoInput = form.elements.photo_upload;
    const photoReference = form.elements.photo_object_id;
    const photoStatus = form.querySelector('[data-photo-status]');
    const image = form.querySelector('[data-photo-preview]');
    const placeholder = form.querySelector('[data-photo-placeholder]');
    const remove = form.querySelector('[data-photo-remove]');
    const photoLabel = form.querySelector('.photo-select span');
    const submit = form.querySelector('#form-submit');
    const status = form.querySelector('#form-status');
    let photoUrl = null;
    let photoRevision = 0;
    submit.disabled = !isLocalPreview;
    for (let age = 25; age <= 52; age += 1) {
      form.elements.age.add(new root.Option(String(age), String(age)));
    }
    mountCityAutocomplete(root, city, CITIES);
    function syncVisit() {
      const required = CITIES.includes(city.value) && city.value !== 'Краснодар';
      visit.closest('.city-visit').hidden = !required;
      visit.required = required;
      if (!required) visit.value = '';
    }
    city.addEventListener('change', syncVisit);
    syncVisit();
    function clearPhoto() {
      photoRevision += 1;
      if (photoUrl) root.URL.revokeObjectURL(photoUrl);
      photoUrl = null;
      image.removeAttribute('src');
      image.hidden = true;
      placeholder.hidden = false;
      remove.hidden = true;
      photoReference.value = '';
      photoStatus.textContent = '';
      photoLabel.textContent = 'Выбрать фотографию';
      photoInput.value = '';
      photoInput.classList.remove('is-invalid');
      photoInput.removeAttribute('aria-invalid');
    }
    photoInput.addEventListener('change', () => {
      const file = photoInput.files?.[0];
      clearPhoto();
      if (!file) return;
      if (!isLocalPreview) {
        photoStatus.textContent = 'Приём фотографий пока недоступен.';
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
        || file.size === 0 || file.size > 10 * 1024 * 1024) {
        photoStatus.textContent = 'Выберите JPEG, PNG или WebP до 10 МБ.';
        return;
      }
      const revision = photoRevision;
      photoUrl = root.URL.createObjectURL(file);
      image.onload = () => {
        if (revision !== photoRevision) return;
        photoReference.value = 'PHOTO-LOCAL-PREVIEW-000000000001';
        image.hidden = false;
        placeholder.hidden = true;
        remove.hidden = false;
        photoLabel.textContent = 'Заменить фотографию';
        photoStatus.textContent = 'Фотография выбрана. Файл остаётся на вашем устройстве.';
      };
      image.onerror = () => {
        if (revision !== photoRevision) return;
        clearPhoto();
        photoStatus.textContent = 'Не удалось открыть изображение. Выберите другую фотографию.';
      };
      image.src = photoUrl;
    });
    remove.addEventListener('click', () => { clearPhoto(); photoInput.focus(); });
    root.addEventListener('pagehide', () => { if (photoUrl) root.URL.revokeObjectURL(photoUrl); });
    form.addEventListener('input', event => {
      event.target.classList.remove('is-invalid');
      event.target.removeAttribute('aria-invalid');
      status.textContent = '';
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!isLocalPreview) {
        status.dataset.state = 'blocked';
        status.textContent = 'Отправка недоступна до обновления приёма заявок.';
        return;
      }
      form.querySelectorAll('.is-invalid').forEach(control => {
        control.classList.remove('is-invalid'); control.removeAttribute('aria-invalid');
      });
      const payload = buildPayload(new root.FormData(form));
      const invalidField = validateFrontendPayload(payload);
      if (invalidField) {
        const control = form.elements[invalidField === 'photo_object_id' ? 'photo_upload' : invalidField];
        control.classList.add('is-invalid');
        control.setAttribute('aria-invalid', 'true');
        control.focus();
        status.dataset.state = 'validation_error';
        status.textContent = invalidField === 'city' ? 'Выберите город из списка.'
          : invalidField === 'photo_object_id' ? 'Добавьте фотографию перед отправкой.'
          : 'Проверьте обязательные поля и формат данных.';
        return;
      }
      status.dataset.state = 'preview';
      status.textContent = 'Проверка пройдена. В preview заявка и фотография не отправлены.';
    });
  }

  return {
    TEST_API_URL,
    PROD_API_URL,
    TEST_FRONTEND_HOST,
    PROD_FRONTEND_HOSTS,
    FRONTEND_MODES,
    PUBLIC_SUBMISSION_MESSAGE,
    PHOTO_UPLOAD_BASE_URL,
    PHOTO_INITIATE_URL,
    PHOTO_COMPLETE_URL,
    FORM_FIELDS,
    FORM_VERSION,
    CONSENT_VERSION,
    POLICY_VERSION,
    buildPayload,
    createIdempotencyKey,
    createMountedPhotoUploadAdapter,
    createLocalPreviewFetch,
    createLocalPreviewPhotoUploadAdapter,
    createPhotoUploadAdapter,
    createSubmitController,
    resolveFrontendMode,
    isValidProdRuntimeConfig,
    isLocalTestPreview,
    responseResult,
    validateFrontendPayload,
    normalizeRussianPhone,
    mount,
  };
});
