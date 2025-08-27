# Satisfeed - Data Collection & Dashboard

## Project Abstract
Team Satisfeed partnered with the nonprofit organization Satisfeed, which delivers hunger relief for Gwinnett’s families in need. With their food co-op and weekend support programs, they work to fight food insecurity and reduce food waste. Their mission is to feed people and connect communities. The team was tasked with developing a data-driven dashboard to visualize client demographics and service usage statistics. Using Google Colab for data analysis and Power BI for dashboard development, we designed an interactive tool that allows the organization to better understand the needs of its clients and make informed decisions about program planning and resource allocation. This project highlights the potential of data science to empower nonprofit organizations in their mission to create meaningful social impact while being able to visualize said impact. 

## Project Documentation:
Project Demo [(https://app.powerbi.com/view?r=eyJrIjoiMGViYzE1YzktZmEzNi00OTJhLThhNWQtZDRkMjczOTZlNzAxIiwidCI6ImNmOTU1MmRiLTY2MGEtNGE5MS05YmQ2LTY1YzIzMDBmOWNiMSIsImMiOjF9)]

Project Website [https://satisfeeddashboardproject.carrd.co] 

Project Poster [STARS/CREATE Poster in the Docs folder] 

Final Report [([Final_Report-_Team_Satisfeed.docx](https://github.com/user-attachments/files/20028096/Final_Report-_Team_Satisfeed.docx)
)]

## Spring 2025 Team
Caleb Cedeno - Project Manager & Visualizations 
Elizabeth Doss - Data analyzer & Client Liason 
Damaris Montecinos - Data modeler, Project Documenter

## Fall 2025 Team
Sam Keller - Code architecture / lead programmer, UI/UX designer, Client liaison
Dylan Long - Testing lead / Team manager

## Outreach Activities

1. Poster was presented at Georgia Gwinnett College's Student Talent and Research Showcase (STARS) 4/17/2025
2. Dashboard demo was given at Georgia Gwinnett College's CREATE Symposium 4/24/2025

## Technologies and Usage

Data was analyzed and visualized using Google Collab, a cloud version of the Python-based Jupyter Notebook. Project management was conducted using Jira. Dashboard
layout was created in Power BI for later implementation in Javascript by Thanh Tran. The final project will include a database and password-protected site where the 
dashboard can be viewed by Satisfeed employees.

## Spring 2025 Project Progress

Disclaimer: The notebook,dataset, and PBIX file cannot be displayed, as they contain personal information of Satisfeed customers including full names, addresses, and phone numbers. Therefore, all displayed metrics and stats are a high-level overview of the analysis without specific data points displayed.

### Analysis Methods
PCA and linear regression were attempted on the data set, but failed due to a lack of numerical data and numerous gaps in client reporting. As a result, most of the 
statistics are simple descriptive ones.

One of the key findings related to a possible motivation for clients using Satisfeed. Of clients who answered demographic questions, 30% reported being unemployed or 
employed only part time. Additionally, the most common income bracket for Satisfeed clients was in the 0-25k range. This suggests that many clients come to Satisfeed 
because they are experiencing financial difficulties.

![image](https://github.com/user-attachments/assets/e4c9e069-d946-4a56-89da-ae47d1f9da80)

![image](https://github.com/user-attachments/assets/08eda490-98dd-49db-bcc2-87bc438ee648)

Another key finding was the background of Satisfeed clients. Of clients who answered, almost 80% were Hispanic or Latino. This may indicate a need for Satisfeed to 
develop bilingual programming, in order to reach those among their client base more confident in Spanish than English.

![image](https://github.com/user-attachments/assets/91d3c0d2-ee81-4221-aaa0-cd337eb5fbde)


### Remaining Scope
It would be optimal to pull data to the dashboard straight from Satisfeeds database, for which plug-in compatibility with PowerBI would have to be researched. The 
client would also like the "lbs of food served" card to be real time where they can live update the data. As of now the card pulls static data from a hypothetical table 
and is used as a placeholder.



