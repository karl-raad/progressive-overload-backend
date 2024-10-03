exports.handler = async (event, context, callback) => {
    const name = event.request.userAttributes.name || "User";
    const email = event.request.userAttributes.email;
    const code = event.request.codeParameter || "No code provided";

    if (!email) {
        callback(new Error("Email is required."));
        return;
    }

    const encodedEmail = encodeURIComponent(email);
    const confirmationUrl = `https://tinyurl.com/progressive-overload/confirm-registration/${encodedEmail}`;

    const emailSubject = 'Welcome to Progressive Overload!';
    const htmlMessage = `
        <p>Hello ${name},</p>
        <p>Thank you for signing up! Please confirm your email address using the following code:</p>
        <p><strong>${code}</strong></p>
        <p>If you lose track of this page, you can confirm your registration using the link below:</p>
        <p><a href="${confirmationUrl}">Confirm Registration</a></p>
        <p>Best,</p>
        <p>Progressive Overload</p>
    `;
    const smsMessage = `Your confirmation code is ${code}`;

    event.response = {
        emailSubject: emailSubject,
        emailMessage: htmlMessage,
        smsMessage: smsMessage
    };

    callback(null, event);
};
