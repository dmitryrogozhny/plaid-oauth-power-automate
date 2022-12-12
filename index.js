let linkTokenData;

// get parameters from the URL, parameters are provided by the PowerApps application
const searchParams = new URLSearchParams(window.location.search);
// URL of the Power Automate flow that processes the Plaid OAuth flow
const oauthFlowUrl = decodeURI(searchParams.get('flow_url'));
// Id of the current user
const userId = searchParams.get('user_id');

/**
 * Gets the link token required to open the Plaid Link UI for connecting to a bank
 */
const initializeLink = async function () {
  try {
    console.log("Flow Url: ", oauthFlowUrl);
    console.log("User Id: ", userId);

    // receive the link token from the flow. After that we're ready to start Plaid's Link
    const linkTokenResponse = await fetch(oauthFlowUrl, {
      method: "POST",
      headers: { "Content-type": "application/json" },
      // pass the flow the "create_link_token" as an action and the current user id
      body: JSON.stringify({ action: "create_link_token", user_id: userId }),
    });

    linkTokenData = await linkTokenResponse.json();

    // if error, show error message
    if (!linkTokenResponse.ok) {
      console.error(linkTokenData);
      showErrorMessage(linkTokenData.error_message);
    } else {
      // ok, got link token, enable button to proceed
      document.querySelector("#startLink").classList.remove("opacity-50");
      console.log(JSON.stringify(linkTokenData));
    }
  } catch(error) {
    console.error(error);
    showErrorMessage(error);
  }
};

/**
 * Opens the Plaid Link UI that allows a user to select a bank and provide consent.
 */
const startLink = function () {
  if (linkTokenData === undefined) {
    return;
  }

  // Configuration for the Plaid Link UI
  const handler = Plaid.create({
    // token link returned by the flow in the initializeLink function
    token: linkTokenData.link_token,
    // logic to run when the user successfully connects to a bank
    onSuccess: async (publicToken, metadata) => {
      console.log(
        `I have a public token: ${publicToken} I should exchange this`
      );
      // exchange the public token provided by Plaid Link for an access token using the flow
      await exchangeToken(publicToken);
    },
    // logic to run in a case of an error
    onExit: (err, metadata) => {
      console.error(
        `I'm all done. Error: ${JSON.stringify(err)} Metadata: ${JSON.stringify(
          metadata
        )}`
      );
    },
    onEvent: (eventName, metadata) => {
      console.log(`Event ${eventName}`);
    },
  });
  // open the Plaid Link UI
  handler.open();
};

/**
 * Calls the flow to exchange the public token for the access token.
 * The access token will be persisted by the flow and will not be returned.
 */
async function exchangeToken(publicToken) {

  try {
    // get the response from the flow
    const tokenExchangeResponse = await fetch(oauthFlowUrl, {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ action: "exchange_public_token", public_token: publicToken }),
    });
    const tokenExchangeData = await tokenExchangeResponse.json();
  
    // if error, show error message
    if (!tokenExchangeResponse.ok) {
      console.error(tokenExchangeData);
      showErrorMessage(tokenExchangeData.error_message);
    } else {
      console.log("Done exchanging our token");

      // navigate to the success.html page to show a message that everything is ok
      window.location.href = "success.html";
    }
  } catch (error) {
    console.error(error);
    showErrorMessage(error);
  }
}

/**
 * Show the error message on the page
 */
function showErrorMessage(message) {
  document.getElementById("errorMessage").innerText = message;
  document.getElementById("errorMessage").classList.remove("hidden");
}

// add click event handler for the button
document.querySelector("#startLink").addEventListener("click", startLink);

// this logic runs when a user opens the page.
// It will call the flow to get the link token required by the Plaid Link
initializeLink();