# HEIMSCH Plattform

## Verbindliche Entwicklungsgrundlagen

Vor jeder Weiterentwicklung von MONTA müssen folgende Dokumente vollständig gelesen werden:

1. MONTA_MASTER_SPRINT.md
2. MONTA_SAFETY.md
3. MONTA_PRINCIPLES.md
4. MONTA_PROJECT.md
5. MONTA_DECISIONS.md
6. MONTA_CHANGELOG.md
7. MONTA_BACKLOG.md
8. MONTA_NEXT_SPRINT.md
9. AUTH_SETUP.md
10. PRINT_STATION_SETUP.md

Diese Dokumente bilden gemeinsam die verbindliche Wissensbasis.

Die Regeln aus MONTA_SAFETY.md und MONTA_PRINCIPLES.md besitzen Vorrang vor Komfortfunktionen.

## Vision

Die HEIMSCH Plattform ist die interne digitale Arbeitsplattform von Metallbau Heimsch.

Sie besteht aus mehreren kleinen, spezialisierten Modulen.

Jedes Modul löst genau eine betriebliche Aufgabe.

Die Plattform wächst ausschließlich aus dem tatsächlichen Bedarf des Unternehmens.

Es werden keine Funktionen entwickelt, die keinen klaren Nutzen im Arbeitsalltag bringen.

---

## Grundprinzipien

### Arbeitszeit sparen

Jede neue Funktion muss Arbeitszeit sparen.

Ist dies nicht eindeutig der Fall, wird sie nicht umgesetzt.

### Einfachheit

- so wenig Klicks wie möglich
- so wenig Eingaben wie möglich
- so wenig unterschiedliche Ansichten wie möglich



### Mobile Nutzung

Alle Module müssen vollständig nutzbar sein auf:

- Windows
- iOS
- Android



### Einheitliche Bedienung

Alle Module sollen sich möglichst gleich bedienen lassen.

Neue Benutzer sollen keine unterschiedlichen Bedienkonzepte lernen müssen.

### Kleine Module

Jedes Modul löst genau eine Aufgabe.

Module werden nicht künstlich erweitert.

### Entwicklung

Neue Module entstehen erst, wenn bestehende Module produktiv genutzt werden.

Aktuell besitzt MONTA höchste Priorität.

---



## Module



### MONTA

Erfassung, Prüfung, Vorbereitung und Bereitstellung von Befestigungsmaterial.

Weitere Module entstehen ausschließlich nach betrieblichem Bedarf.

---



## Nicht Bestandteil

Die Plattform ist kein ERP.

Keine unnötigen Statistiken.

Keine Funktionen ohne konkreten betrieblichen Nutzen.

Keine Entwicklung nur deshalb, weil sie technisch möglich ist.

---



## Zugang

Module der HEIMSCH Plattform sind interne Werkzeuge.

Öffentlicher anonymer Datenzugriff ist nicht vorgesehen.

Authentifizierung und Freigabe erfolgen modulbezogen (bei MONTA über
Supabase Auth und Administratorfreigabe).

Workflow-Benachrichtigungen (bewusste Abschlussfreigaben) und gerätebezogene
Druckstationen sind Teil des MONTA-Moduls, keine Plattform-ERP-Funktionen.

---



## Grundsatz

Einfach schlägt komplex.

Der tatsächliche Arbeitsablauf entscheidet.

Nicht die Technik.

---



## Ideenparkplatz



### Standard-Initialisierung neuer Module

Beim nächsten neuen Modul wird zuerst dieselbe schlanke Dokumentationsstruktur wie bei MONTA angelegt:

- MODUL_[PROJECT.md](http://PROJECT.md)
- MODUL_[DECISIONS.md](http://DECISIONS.md)
- MODUL_[CHANGELOG.md](http://CHANGELOG.md)
- MODUL_[BACKLOG.md](http://BACKLOG.md)
- MODUL_NEXT_[SPRINT.md](http://SPRINT.md)

Diese Regel wird erst beim nächsten Modul angewendet. ## Verbindliche Grundlagen

Vor jeder Entwicklung sind folgende Dokumente vollständig zu lesen:

1. MONTA_[PROJECT.md](http://PROJECT.md)
2. MONTA_[DECISIONS.md](http://DECISIONS.md)
3. MONTA_[SAFETY.md](http://SAFETY.md)
4. MONTA_[PRINCIPLES.md](http://PRINCIPLES.md)
5. MONTA_[CHANGELOG.md](http://CHANGELOG.md)
6. MONTA_[BACKLOG.md](http://BACKLOG.md)
7. MONTA_NEXT_[SPRINT.md](http://SPRINT.md)

Diese Dokumente bilden gemeinsam die verbindliche Wissensbasis für jede Weiterentwicklung von MONTA.