import Mailgen from "mailgen";
import nodemailer from "nodemailer"

//method for sending an email
const sendEmail = async (options) => {
    const mailGenrator = new Mailgen({
        theme: "default",
        product: {
            name :  "TaskManager",
            link :  "https://taskmanagerlink.com"
        }
    });
    //enaul gen html or plaintext
    const emailTextual = mailGenrator.generatePlaintext(options.mailgenContent);
    const emailHTML = mailGenrator.generate(options.mailgenContent);

    //filling in creds
    const transporter = nodemailer.createTransport({
        host : process.env.MAILTRAP_SMTP_HOST,
        port : process.env.MAILTRAP_SMTP_PORT,
        auth : {
            user : process.env.MAILTRAP_SMTP_USER,
            pass : process.env.MAILTRAP_SMTP_PASS
        }
    });

    //mails format
    const mail = {
        from: "mail.taskmanager@example.com",
        to: options.email,
        subject: options.subject,
        text: emailTextual,
        html: emailHTML
    }

    try {
        await transporter.sendMail(mail)
    } catch (error) {

        console.error("error hogya ooe");
        console.error("Error : " , error);
        
        throw  error;
    }
}


//generating the email

const emailVerificationMailgenContent =  (username , verficaionUrl)=>{
        return {
            body: {
                name : username,
                intro : "email intro tung tung sahur the og",
                action : {
                    instructions : "Click below to verify",
                    button :  {
                        color : "#22BC66",
                        text : "verify" , 
                        link : verficaionUrl
                    },
                },
                outro : "Need help ? then fuck off"
            }
        };
};

//password reset 
const forgotPasswordMailgenContent =  (username , passwordResrtUrl)=>{
        return {
            body: {
                name : username,
                intro : "tung tung sahur the og",
                action : {
                    instructions : "Click below to reset",
                    button :  {
                        color : "#bc2222",
                        text : "Reset Password" , 
                        link : passwordResrtUrl
                    },
                },
                outro : "Need help ? then fuck off"
            }
        };
};



export{ emailVerificationMailgenContent , forgotPasswordMailgenContent , sendEmail}