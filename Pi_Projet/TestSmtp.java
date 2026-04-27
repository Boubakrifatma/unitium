import jakarta.mail.*;
import jakarta.mail.internet.*;
import java.util.Properties;

/**
 * Run this file to test SMTP connection independently from Spring Boot.
 * Usage: javac -cp angus-mail.jar TestSmtp.java && java -cp .;angus-mail.jar TestSmtp
 *
 * Or simply run it from IntelliJ as a plain Java class (right-click → Run).
 */
public class TestSmtp {

    // ── Change these values to test ──────────────────────────────────────────
    static final String HOST     = "smtp.gmail.com";
    static final int    PORT     = 587;
    static final String USERNAME = "ca.unitumgroup1@gmail.com";
    static final String PASSWORD = "xnohamhyidksufuw";   // App Password (no spaces)
    static final String FROM     = "ca.unitumgroup1@gmail.com";
    static final String TO       = "ca.unitumgroup1@gmail.com"; // send to yourself to verify
    // ────────────────────────────────────────────────────────────────────────

    public static void main(String[] args) {
        System.out.println("=== SMTP Test ===");
        System.out.println("Host     : " + HOST + ":" + PORT);
        System.out.println("Username : " + USERNAME);
        System.out.println("From     : " + FROM);
        System.out.println("To       : " + TO);
        System.out.println();

        Properties props = new Properties();
        props.put("mail.smtp.host",                HOST);
        props.put("mail.smtp.port",                String.valueOf(PORT));
        props.put("mail.smtp.auth",                "true");
        props.put("mail.smtp.starttls.enable",     "true");
        props.put("mail.smtp.starttls.required",   "true");
        props.put("mail.smtp.connectiontimeout",   "10000");
        props.put("mail.smtp.timeout",             "10000");

        Session session = Session.getInstance(props, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(USERNAME, PASSWORD);
            }
        });

        session.setDebug(true); // prints full SMTP conversation

        try {
            Message msg = new MimeMessage(session);
            msg.setFrom(new InternetAddress(FROM, "SMTP Test"));
            msg.setRecipients(Message.RecipientType.TO, InternetAddress.parse(TO));
            msg.setSubject("✅ SMTP Test — Pi_Projet");
            msg.setText("If you receive this email, your SMTP configuration is working correctly.\n\nHost: " + HOST + "\nUsername: " + USERNAME);

            System.out.println("Connecting to SMTP server...");
            Transport.send(msg);
            System.out.println();
            System.out.println("✅ SUCCESS — Email sent to " + TO);
            System.out.println("Check your inbox (and spam folder).");

        } catch (AuthenticationFailedException e) {
            System.out.println();
            System.out.println("❌ AUTHENTICATION FAILED");
            System.out.println("Cause: " + e.getMessage());
            System.out.println();
            System.out.println("Fix:");
            System.out.println("  1. Make sure 2-Step Verification is ON for " + USERNAME);
            System.out.println("  2. Go to https://myaccount.google.com/apppasswords");
            System.out.println("  3. Delete the old App Password and generate a new one");
            System.out.println("  4. Update PASSWORD in this file and in application.properties");

        } catch (MessagingException e) {
            System.out.println();
            System.out.println("❌ SMTP ERROR: " + e.getMessage());
            e.printStackTrace();
        } catch (Exception e) {
            System.out.println();
            System.out.println("❌ UNEXPECTED ERROR: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
