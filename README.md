# PENELCO Outage Tracker

Web app to track PENELCO outages. I developed this out of frustration from keeping track of outages because PENELCO only posts images for their outage announcements, and sometimes they post an image with a text list of areas and this makes it hard to track whether your location will be affecter or not

## How it works

### 1. Fetch outage posts from PENELCO

I did this by reverse engineering their mobile app to find their API that returns posts (with content and images). The image also stored locally since PENELCO returns the image in the API as a base64 string instead of a URL (I don't know why they decided to do this, each API request is slow and 1MB+ in size because of it).

This is done one a scheduled task (every 30 minutes) to keep it up to date.

There are actually 3 ways (that I know of) to fetch the outage posts from PENELCO:

1. [PENELCO's Facebook Page](https://www.facebook.com/penelco/); seems the most up-to-date, but requires Facebook scraping which is quite difficulty.
2. [PENELCO's mobile app](https://play.google.com/store/apps/details?id=com.penelco.app) API; they recently published a mobile app and it has HTTP endpoints that return the outage posts. This seems up-to-date too (so far), so I ended up using this as my source
3. [From PENELCO's website](https://www.penelco.com/outages); This was initially my primary choice because it was easy to access, but it doesn't seem to be as up-to-date, thankfully they released their mobile app

### 2. Feed the images into LLM / VLM

Then I feed the images to extract the text as a structured format that can be easily processed. The reason why I choose LLM / VLM instead of traditional OCR is because the image format are often inconsistent, which means I have to cover each possible layout and format (I did try, and it's PITA). For production, I use free model from DeepSeek (DS 4.1 Flash), from my testing, it's pretty accurate.

### 3. Store the structured data

After extracting the text from the images as a structured format, the data is stored in a database. I also feed the structured data into LLM (again, using DS 4.1 Flash) to help group multiple posts that refer to the same outage.

## Future Improvements

- Calendar view for outages
- Allowing users to subscribe to certain areas to receive notification when there's a scheduled outage (possibly via PWA / Web Push).
- Improve the accuracy of text extraction by fine-tuning the model (if needed)

---

Icon used: <a href="https://www.flaticon.com/free-icons/power-outage" title="power outage icons">Power outage icons created by Magnific - Flaticon</a>
