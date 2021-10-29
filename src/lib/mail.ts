import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

let mailAccount = { user: process.env.MAILUSER + "@mail." + process.env.DOMAIN, pass: process.env.MAILPASSWORD };

let transporter = nodemailer.createTransport(
  new SMTPTransport({
    host: "localhost",
    port: 587,
    secure: false,
    auth: {
      user: mailAccount.user,
      pass: mailAccount.pass,
    },
    tls: {
      rejectUnauthorized: false,
      secureProtocol: "TLSv1_method",
    },
  })
);

if (process.env.DEV == "true") {
  (async () => {
    mailAccount = await nodemailer.createTestAccount();
    if (process.env.NODE_ENV != "test") {
      console.log(mailAccount);
    }
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: mailAccount.user, // generated ethereal user
        pass: mailAccount.pass, // generated ethereal password
      },
    });
  })();
}

const sendMail = async (from: string, to: string, subject: string, text?: string, html?: string) => {
  return await transporter.sendMail({
    from: from,
    to: to,
    subject: subject,
    text: text,
    html: html,
  });
};

export default { sendMail, mailAccount };
