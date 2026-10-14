# Shared organizer shell

`eventra-shell.css` + `eventra-shell.js` render the ONE sidebar and ONE top bar used by
every organizer page (Dashboard, Create Event steps 1-5, Attendees, Check-in, Analytics, Settings).

Change the sidebar links, top-bar controls or styles here and every page updates.

To use it on a page:

    <link rel="stylesheet" href="../shared/eventra-shell.css">     (in <head>)
    <body data-eventra-nav="dashboard">                            (dashboard | events | attendees | checkin | analytics | settings)
    <script src="../shared/eventra-shell.js"></script>             (first line inside <body>)

Layout: fixed 250px sidebar from 1024px up; below that a slide-in drawer opened by the hamburger.
Pages must not add their own left margin: the shell pads the page via `body.eventra-shell`.
