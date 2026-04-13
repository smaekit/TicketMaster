## Problem
The application is collecting tickets by e-mail that can be in all form of subjects. Some of the subjects are already answered in the FAQ section.

These emails need to be answered manually by selecting a solution, often already prewritten text, which does not make the response personal.

It also takes a lot of time to respond manually.

## Solution
Build a ticket management system that uses AI to automatically classify, respond to, and route support tickets, delivering faster, more personalized responses to students while freeing up agents for complex issues.

## Users & Roles

| Role | Description |
|------|-------------|
| Admin | Seeded on deployment. Can create and manage agents. Has full access to all system features. |
| Agent | Created by Admin. Support staff who review, manage, and respond to tickets. |

Students are external — they have no system account and no access to the ticket system. They interact solely by sending emails to the support inbox.

## Ticket Categories
Tickets are classified by AI into one of the following categories:
- General Question
- Technical Question
- Refund Request

## Ticket Statuses
| Status | Description |
|--------|-------------|
| Open | Ticket has been received and is awaiting resolution. |
| Resolved | A response has been sent to the student. |
| Closed | Ticket has been fully handled and requires no further action. |

## Features
- Read support emails and automatically create tickets
- Auto-generate human-friendly responses using a knowledge base
- Ticket list with filtering and sorting
- Ticket detail view
- AI-powered ticket classification
- AI summaries
- AI-suggested replies
- User Management (admin only)
- Dashboard to view and manage all tickets
