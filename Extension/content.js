console.log("email writer extension, content script loaded!");
// use MutationObserver to watch for the DOM tree changes and inject the 'generate reply' button dynamically

function findComposeToolbar() {
    const selectors = ['.btC', '.aDh', '[role="toolbar"]', '.gU.Up']
    for (const selector of selectors) {
        const toolbar = document.querySelector(selector);
        if (toolbar) {
            return toolbar;
        }
        return null;
    }
}

function getEmailContent(){
    const selectors = ['.h7', '.a3s.aiL', '[role="presentation"]', '.gmail_quote']
    for (const selector of selectors) {
        const content = document.querySelector(selector);
        if (content) {
            return content.innerText.trim();
        }
        return '';
    }
}

function createAIButton() {
    const button = document.createElement('div');
    button.className = 'T-I J-J5-Ji aoO v7 T-I-atl L3';  //gmail button classes
    button.style.marginRight = '8px';
    button.innerHTML = 'AI Reply';
    button.setAttribute('role','button');
    button.setAttribute('data-tooltip', 'Generate AI Reply');
    return button;
}

function injectButton() {
    console.log("Button Injected!");
    const existingButton = document.querySelector(".ai-reply-button");
    if ( existingButton )
        existingButton.remove();
    const toolbar = findComposeToolbar();
    if (!toolbar) {
        console.log("Toolbar not found!");
        return;
    }
    console.log("Toolbar found!");
    const button = createAIButton();
    button.classList.add('.ai-reply-button');
    
    button.addEventListener('click', async() => {
        try {
            button.innerHTML = "Generating...";
            button.disabled = true;

            const emailContent = getEmailContent();
            const response = await fetch('https://emailreplyai.onrender.com/api/email/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "emailContent": emailContent,
                    "tone": "professional"
                })
            });

            if (!response.ok) {
                throw new Error('API Request Failed');
            }

            const generatedReply = await response.text();
            const composeBox = document.querySelector('[role="textbox"][g_editable="true"]');
            
            if (composeBox) {
                composeBox.focus();
                document.execCommand('insertText', false, generatedReply);  //to insert the text, a method that allows to you to apply styling and stuff. Programmatic way to mimic user actions like typing without directly manipulating the DOM
            } else {
                console.error("composeBox was not found!");
            }
        } catch (error) {
            // console.error(error);
            alert('Failed to generate Reply');
        } finally {
            button.innerHTML = 'AI Reply';
            button.disabled = false;
        }
    });

    toolbar.insertBefore(button, toolbar.firstChild);
}

const observer = new MutationObserver((mutations) => {
    for(const mutation of mutations) {
        const addedNodes = Array.from(mutation.addedNodes);
        const hasComposeElements = addedNodes.some( node =>  //some() is a js based method that checks if atleast one element of the array matches a certain condition
            node.nodeType === Node.ELEMENT_NODE &&  //Checks if the element is an actual HTML node rather than some text or doc part
            (node.matches(".aDh, .btC, [role='dialog']") || node.querySelector(".aDh, .btC, [role='dialog']"))  //check if the node itself matches the specified selectors or if any of the children matches the specified selectors (querySelector())
        );

        if (hasComposeElements) {
            console.log("Compose Window Detected!");
            setTimeout(injectButton, 500);
        }
    }
});

observer.observe(document.body,{
    childList: true,
    subtree: true
});
