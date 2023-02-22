

Source Files:
    1. README.txt
    2. public folder with images, styles, and javascripts subfolder.
    3. models folder for all the mongoose schema files.
    4. routes folder with fruits-router and personal-router
    5. view folder with all display pages subfolder and partials subfoler for header and footer.
    6. database-cleaner.js
    7. app.js - entry point for the server.
    8. package.json to manage all dependencies
    9. package-lock.json to manage all version related dependencies.
    10.fruit_index.json (each time you run app.js, it will generate new fruit_index.json)
    11.fruit-crawler.js to crawl the fruits page.
    12.fruit-pagerank.js to calculate the pagerank for fruits data.
    13.personal_crawler.js to crawl the personal choice of website.(https://carleton.ca)
    14.personal_pagerank.js to calculate the pagerank for personals data in database crawledpages.
    15.personal_index.json (each time you run app.js, it will generate new personal_index.json)


Instruction:

    1.make sure the mongodb is running using command:
      mongod --dbpath=<database folder>

    2.*****IMPORTANT*****
      before running the program, make sure to clean the crawledpages database using
      node database-cleaner.js
      'npm install' to install all necessary dependencies in the directory where the app.js is.

      and then initialize the database collection for fruits(called pages in database crawledpages) using:
      node fruit-crawler.js

      ***note*** the fruits_pagerank.js dose not need to run seperately, it's called inside fruit-crawler.js
      once the crawling process is done. Once the pageranks printed out for fruits data in the console, the
      crawler is finished.

      then open a seperate terminal tab to run command:
      node personal_crawler.js
      ***note*** once the crawler is counting around 550 and update incoming/outgoing done showing
      in the terminal, you can stop the process and run command:

      node personal_pagerank.js
      ***note*** once all the pageranks are printed for all 25 pages in the terminal, the page rank calculation
      is done.


    3. once all these are done, we can run the server using command:
        node app.js
       and you will see following messages:
         connected to Database
         server listening on port 3000
         fruit index done
         personal index done

    4. once server is successfully connected, open the browser of your choice and navigate to http://127.0.0.1:3000/ and you
       will see the welcome page displayed.
    5. The top of the page is the header which allows you to navigate through home, Top10Pagesfromfruits, search fruits and search personals.
    6. The Top10Pagesfromfruits is showing result from lab 3 with link to each single page of fruit data and the frequency of visit.
    7. The search fruits will allow user to search words in fruits database and specify if they want to have pagerank boosted or not and the
       search result is from 1 to 50 pages and default at 10. Each search result will link to the single page with title, original url, frequency
       of visit, world count, and incoming/outgoing links to the original url.
    8. The search personals will allow user to search words in personal database and specify if they want to have pagerank boosted or not and the
       search result is from 1 to 50 pages and default at 10. Each search result will link to the single page with title, original url, frequency
       of visit, world count, and incoming/outgoing links to the original url.
    9.If you want to reset the database, run command:
        node database-cleaner.js
       all data will be reset to empty and you need to rerun the fruits-crawler.js, personal_crawler.js, and personal_pagerank.js again.

Design:
    A simple search engine with specified to fruits data and personal choice of data (https://carleton.ca in this case).

    *****fruits data*****
    The data was crawled using fruit-crawler.js and stored under pages collection in db crawledpages. Each page was saved while crawling the page.
    and all incoming links are calculated after 1000 pages are crawled and saved in the database.
    Incoming and outgoing links are saved as titles since each fruit page has different titles.
    pid were added to calculated the pagerank of the fruits data and saved as a counter schema in counters collection in the database.
    Each time when app.js is started, the fruit_index.json will be recalculated incase some change to the database.

    *****personals data*****
    The data was crawled using personal_crawler.js and stored under personals collection in db crawledpages. Each page was saved while crawling the page.
    and all incoming links are calculated after around 550 pages.
    while crawling the page, we restrict the type of page we crawl and data we saved in the database. We also restricted the number of crawled
    pages by using the total database count and crawler's queue size to predict the potential pages we crawled in total. The number of pages we
    saved are precisely controlled within 2 pages of 550.
    Incoming and outgoing links are saved as urls.
    pid were added to calculated the pagerank of the fruits data and each time when app.js is started, the personals.json will be recalculated
    incase some change to the database.
                                          ****Note****
    The personal crawler might take longer time since it has a lot of work to restrict urls and data saved in the database. If it is
    stuck in the middle of crawling process, please stop the crawler and clean the database and restart both crawler again.
