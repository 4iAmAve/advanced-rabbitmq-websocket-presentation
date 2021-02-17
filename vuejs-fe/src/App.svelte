<script lang="ts">
  export let env: any;
  export let baseURL: any;
  export let locale: any;
  export let user: any;
  export let publishToTopic: any;
  export let subscribeToTopic: any;
  export let unsubscribeFromToken: any;

  let toastText = '';
  let selectedToastType: 'error';
  let success = 'success';
  let error = 'error';
  let subTopic = '';
  let unsubTopic = '';

  function showToast() {
    publishToTopic('wip.toast.add', { type: selectedToastType, message: toastText });
  }
  function showError() {
    publishToTopic('wip.error.show');
  }
  function navigate() {
    publishToTopic('wip.navigation.navigate', '/');
  }
  function requestLogin() {
    publishToTopic('wip.requestLogin', '/');
  }
  function requestLogout() {
    publishToTopic('wip.requestLogout', '/');
  }
  function unsubscribe() {
    unsubscribeFromToken(unsubTopic);
  }
  function subscribe() {
    subscribeToTopic(subTopic, (payload: any) => console.log(subTopic, payload));
  }
  function showModal() {
    publishToTopic('wip.modal.open', { title: 'Test-Module Headline', content: getCloseButton() });
  }
  function showModalWithModule() {
    publishToTopic('wip.modal.open', {
      title: 'Test-Module Headline',
      content: 'dummy-module-for-modal',
      type: 'module',
    });
  }
  function closeModal() {
    publishToTopic('wip.modal.close', null);
  }
  const getCloseButton = () => {
    setTimeout(() => {
      const ModalContentSelector = document.querySelector('[data-testid*="modal-content"]');
      const component = document.createElement('div');
      const clonedBtn = document.createElement('button');
      clonedBtn.addEventListener('click', () => closeModal());
      clonedBtn.id = 'innerModalCLoseBtn';
      clonedBtn.classList.add('myBtn');
      clonedBtn.innerText = 'Click to close dialogue';
      component.id = 'modalCloseBtn';
      component.appendChild(clonedBtn);
      ModalContentSelector.appendChild(component);
    }, 1000);
  };
</script>

<style>
  :global(#moduleMain) {
    max-width: 880px;
    padding: 16px;
  }
  b {
    word-break: break-all;
  }
  .input {
    display: flex;
  }
</style>

<div>You are running on stage: <b>{env}</b></div>
<div>The baseURL is: <b>{baseURL}</b></div>
<div>The locale is: <b>{locale}</b></div>
<div>The user object is: <b>{JSON.stringify(user)}</b></div>

<div class="input">
  <input data-testid="toastText" type="text" bind:value={toastText} />
  <select data-testid="toastTypeSelect" bind:value={selectedToastType}>
    <option value={success}>{success}</option>
    <option value={error}>{error}</option>
  </select>
  <button data-testid="showToastBtn" class="myBtn" on:click={showToast}>Show Toast</button>
</div>
<div class="input">
  <input type="text" bind:value={subTopic} />
  <button class="myBtn" on:click={subscribe}>Subscribe To Topic</button>
</div>
<div class="input">
  <input type="text" bind:value={unsubTopic} />
  <button class="myBtn" on:click={unsubscribe}>Unsubscribe From Topic</button>
</div>
<button class="myBtn" data-testid="showErrorBtn" on:click={showError}>Show Error</button>
<button class="myBtn" on:click={navigate}>Navigate to /</button>
<button class="myBtn" on:click={requestLogin}>Request Login</button>
<button class="myBtn" on:click={requestLogout}>Request Logout</button>
<button class="myBtn" data-testid="showModalBtn" on:click={showModal}>Show Modal</button>
<button class="myBtn" data-testid="closeModalBtn" on:click={closeModal}>Close Modal</button>
<button class="myBtn" data-testid="openModuleInModalBtn" on:click={showModalWithModule}>Show Modal with module</button>
