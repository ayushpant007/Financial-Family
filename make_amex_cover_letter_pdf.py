from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


OUTPUT = "Bhavay_Khandelwal_American_Express_Apprentice_Cover_Letter_Professional.pdf"


def build_pdf() -> None:
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        rightMargin=0.64 * inch,
        leftMargin=0.64 * inch,
        topMargin=0.44 * inch,
        bottomMargin=0.48 * inch,
        title="Bhavay Khandelwal - American Express Apprentice Cover Letter",
        author="Bhavay Khandelwal",
    )

    styles = getSampleStyleSheet()
    normal = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.25,
        leading=12.7,
        textColor=colors.HexColor("#333333"),
        spaceAfter=7.5,
    )
    header = ParagraphStyle(
        "Header",
        parent=normal,
        fontName="Helvetica-Bold",
        fontSize=19.5,
        leading=22,
        textColor=colors.HexColor("#073763"),
        spaceAfter=1,
    )
    title = ParagraphStyle(
        "TitleLine",
        parent=normal,
        fontName="Helvetica",
        fontSize=11.5,
        leading=14,
        textColor=colors.HexColor("#073763"),
        spaceAfter=11,
    )
    label = ParagraphStyle(
        "Label",
        parent=normal,
        fontSize=8.9,
        leading=11.4,
        spaceAfter=3.3,
    )
    salutation = ParagraphStyle(
        "Salutation",
        parent=normal,
        spaceBefore=11,
        spaceAfter=8,
    )
    close = ParagraphStyle(
        "Close",
        parent=normal,
        spaceBefore=5,
        spaceAfter=0,
    )
    ps_style = ParagraphStyle(
        "PS",
        parent=normal,
        fontSize=8.9,
        leading=12.2,
        spaceBefore=8,
    )

    story = [
        Paragraph("Bhavay Khandelwal", header),
        Paragraph("Data Analyst | Apprentice Applicant", title),
        Paragraph("<b>Address</b>&nbsp;&nbsp; Jaipur, Rajasthan, India", label),
        Paragraph("<b>Phone</b>&nbsp;&nbsp; +91 9602525627", label),
        Paragraph("<b>E-mail</b>&nbsp;&nbsp; bl1183757@gmail.com", label),
        Paragraph("<b>LinkedIn</b>&nbsp;&nbsp; linkedin.com/in/bhavay-khandelwal-11ab0b3a3", label),
        Spacer(1, 13),
        Paragraph("May 27, 2026", normal),
        Spacer(1, 5),
        Paragraph("Hiring Team<br/>American Express<br/>Gurugram, Haryana, India", normal),
        Paragraph("Dear Hiring Team,", salutation),
        Paragraph(
            "I noticed the Apprentice opportunity at American Express and was "
            "immediately drawn to it because it brings together the two things I "
            "am most eager to build my career around: analytical problem-solving "
            "and meaningful business impact. As a final-year B.Tech student in "
            "Artificial Intelligence and Data Science, with practical experience "
            "in SQL, Python, Excel, Power BI, Tableau, and data storytelling, I "
            "believe I can contribute with both curiosity and discipline from "
            "day one.",
            normal,
        ),
        Paragraph(
            "You are looking for someone who can learn quickly, handle data with "
            "accuracy, communicate clearly, and support teams that depend on "
            "reliable insights. In my current Data Analyst role at Financial "
            "Friend, I work with financial and customer datasets, perform data "
            "quality checks, build reporting workflows, and create dashboards for "
            "stakeholders. By strengthening validation rules and improving data "
            "governance, I helped reduce reporting discrepancies by 25%. I also "
            "built automated Power BI dashboards with DAX measures that reduced "
            "manual reporting effort by 30%, allowing stakeholders to focus more "
            "on decisions rather than repeated data preparation.",
            normal,
        ),
        Paragraph(
            "My academic and project work has also prepared me well for this "
            "opportunity. In an e-commerce analytics project, I extracted and "
            "joined more than 200K rows using SQL, built a star-schema Power BI "
            "model, and identified customer segments contributing to churn and "
            "revenue loss. In an HR analytics project, I combined six datasets, "
            "used Python and SQL Server for analysis, and created an executive "
            "dashboard that highlighted the top attrition-risk segments while "
            "reducing weekly reporting effort by 40%. These experiences taught "
            "me how to move from raw data to a clear business story.",
            normal,
        ),
        Paragraph(
            "The reason I am especially excited about American Express is the "
            "standard it sets for customer trust, service excellence, and "
            "data-backed decision-making. I would be grateful for the opportunity "
            "to learn in such an environment, contribute to real business "
            "problems, and grow under teams that value precision, ownership, and "
            "continuous improvement. I am not only looking for my first strong "
            "professional platform; I am looking for a place where I can earn "
            "responsibility through consistent, high-quality work.",
            normal,
        ),
        Paragraph(
            "When could we connect to discuss how my analytical skills, project "
            "experience, and enthusiasm for learning can support the Apprentice "
            "role at American Express?",
            normal,
        ),
        Paragraph("Best Regards,<br/><br/>Bhavay Khandelwal<br/>+91 9602525627<br/>bl1183757@gmail.com", close),
        Paragraph(
            "PS I would also be happy to share how I ranked in the top 2% nationally "
            "in a data skills competition and applied those skills in real dashboarding "
            "and automation projects.",
            ps_style,
        ),
    ]

    doc.build(story)


if __name__ == "__main__":
    build_pdf()
