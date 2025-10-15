import axios from 'axios';
import admin, { db } from './firebase';

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://n8n:5678';
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

interface N8nWorkflow {
  name: string;
  webhookUrl: string;
  description: string;
}

// Available n8n workflows
const workflows: Record<string, N8nWorkflow> = {
  meetingPDF: {
    name: 'Generate Meeting PDF',
    webhookUrl: `${N8N_BASE_URL}/webhook/meeting-pdf`,
    description: 'Creates a PDF summary of meeting minutes',
  },
  emailMeetingMinutes: {
    name: 'Email Meeting Minutes',
    webhookUrl: `${N8N_BASE_URL}/webhook/email-meeting-minutes`,
    description: 'Emails meeting minutes to all attendees',
  },
  weeklyReport: {
    name: 'Weekly Activity Report',
    webhookUrl: `${N8N_BASE_URL}/webhook/weekly-report`,
    description: 'Generates weekly activity report for management',
  },
  taskDigest: {
    name: 'Daily Task Digest',
    webhookUrl: `${N8N_BASE_URL}/webhook/task-digest`,
    description: 'Sends daily task digest email',
  },
  projectStatus: {
    name: 'Project Status Update',
    webhookUrl: `${N8N_BASE_URL}/webhook/project-status`,
    description: 'Generates and emails project status report',
  },
};

/**
 * Trigger n8n workflow
 */
export async function triggerN8nWorkflow(
  workflowKey: keyof typeof workflows,
  data: any
) {
  const workflow = workflows[workflowKey];
  
  if (!workflow) {
    throw new Error(`Unknown workflow: ${workflowKey}`);
  }

  try {
    const response = await axios.post(
      workflow.webhookUrl,
      {
        ...data,
        secret: N8N_WEBHOOK_SECRET,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    console.log(`✅ n8n workflow ${workflow.name} triggered successfully`);
    return response.data;

  } catch (error: any) {
    console.error(`❌ n8n workflow ${workflow.name} failed:`, error.message);
    throw error;
  }
}

/**
 * Generate and email meeting PDF to attendees
 */
export async function generateMeetingPDF(meetingMinutesId: string) {
  const meetingDoc = await db.collection('meeting_minutes').doc(meetingMinutesId).get();
  const meetingData = meetingDoc.data();
  
  if (!meetingData) {
    throw new Error('Meeting not found');
  }

  // Use meetingData for all property access
  const attendeeEmails = await getAttendeeEmails(meetingData.attendeeIds || []);

  const result = await triggerN8nWorkflow('meetingPDF', {
    meetingId: meetingMinutesId,
    meeting: {
      title: meetingData.title,
      date: meetingData.date,
      summary: meetingData.summary,
      keyPoints: meetingData.keyPoints,
      decisions: meetingData.decisions,
      actionItems: meetingData.actionItems,
      transcript: meetingData.transcript,
    },
    attendees: attendeeEmails,
  });

  return result;
}

/**
 * Email meeting minutes to attendees
 */
export async function emailMeetingMinutes(meetingMinutesId: string) {
  const meetingDoc = await db.collection('meeting_minutes').doc(meetingMinutesId).get();
  const meetingData = meetingDoc.data();
  
  if (!meetingData) {
    throw new Error('Meeting not found');
  }

  const meeting = { id: meetingDoc.id, ...meetingData };
  const attendeeEmails = await getAttendeeEmails(meetingData.attendeeIds || []);

  const result = await triggerN8nWorkflow('emailMeetingMinutes', {
    meetingId: meetingMinutesId,
    meeting,
    recipients: attendeeEmails,
    sender: meetingData.userId,
  });

  await db.collection('meeting_minutes').doc(meetingMinutesId).update({
    emailedAt: admin.firestore.FieldValue.serverTimestamp(),
    emailedTo: attendeeEmails,
  });

  return result;
}

/**
 * Generate weekly activity report
 */
export async function generateWeeklyReport(userId: string, recipients: string[]) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [meetings, tasks, projects] = await Promise.all([
    db.collection('meeting_minutes')
      .where('userId', '==', userId)
      .where('date', '>=', weekAgo)
      .get(),
    db.collection('tasks')
      .where('ownerId', '==', userId)
      .where('createdAt', '>=', weekAgo)
      .get(),
    db.collection('projects')
      .where('ownerId', '==', userId)
      .get(),
  ]);

  const reportData = {
    userId,
    weekStart: weekAgo.toISOString(),
    weekEnd: new Date().toISOString(),
    meetings: meetings.docs.map(d => ({ id: d.id, ...d.data() })),
    tasks: tasks.docs.map(d => ({ id: d.id, ...d.data() })),
    projects: projects.docs.map(d => ({ id: d.id, ...d.data() })),
    stats: {
      totalMeetings: meetings.size,
      totalTasks: tasks.size,
      completedTasks: tasks.docs.filter((d: any) => d.data().status === 'done').length,
      activeProjects: projects.size,
    },
  };

  const result = await triggerN8nWorkflow('weeklyReport', {
    report: reportData,
    recipients,
  });

  return result;
}

/**
 * Generate project status report
 */
export async function generateProjectStatus(projectId: string, recipients: string[]) {
  const projectDoc = await db.collection('projects').doc(projectId).get();
  const project = { id: projectDoc.id, ...projectDoc.data() };

  const [tasks, meetings] = await Promise.all([
    db.collection('tasks')
      .where('projectId', '==', projectId)
      .get(),
    db.collection('meeting_minutes')
      .where('projectId', '==', projectId)
      .orderBy('date', 'desc')
      .limit(10)
      .get(),
  ]);

  const tasksData = tasks.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const statusData = {
    project,
    tasks: tasksData,
    meetings: meetings.docs.map(d => ({ id: d.id, ...d.data() })),
    stats: {
      totalTasks: tasksData.length,
      completedTasks: tasksData.filter((t: any) => t.status === 'done').length,
      inProgressTasks: tasksData.filter((t: any) => t.status === 'in_progress').length,
      overdueTasks: tasksData.filter((t: any) => 
        t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
      ).length,
      totalMeetings: meetings.size,
    },
  };

  const result = await triggerN8nWorkflow('projectStatus', {
    projectStatus: statusData,
    recipients,
  });

  return result;
}

/**
 * Send daily task digest
 */
export async function sendTaskDigest(userId: string, userEmail: string) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tasksSnapshot = await db.collection('tasks')
    .where('ownerId', '==', userId)
    .where('status', 'in', ['todo', 'in_progress'])
    .get();

  const tasks = tasksSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  const todayTasks = tasks.filter((t: any) => {
    if (!t.dueDate) return false;
    const dueDate = new Date(t.dueDate);
    return dueDate.toDateString() === today.toDateString();
  });

  const overdueTasks = tasks.filter((t: any) => {
    if (!t.dueDate) return false;
    const dueDate = new Date(t.dueDate);
    return dueDate < today;
  });

  const result = await triggerN8nWorkflow('taskDigest', {
    userId,
    date: today.toISOString(),
    tasks: {
      today: todayTasks,
      overdue: overdueTasks,
      upcoming: tasks.filter((t: any) => {
        if (!t.dueDate) return false;
        const dueDate = new Date(t.dueDate);
        return dueDate > today && dueDate <= tomorrow;
      }),
    },
    recipient: userEmail,
  });

  return result;
}

// Helper function
async function getAttendeeEmails(attendeeIds: string[]): Promise<string[]> {
  if (attendeeIds.length === 0) return [];

  const emails: string[] = [];
  for (const id of attendeeIds) {
    const contactDoc = await db.collection('contacts').doc(id).get();
    const contact = contactDoc.data();
    if (contact?.email) {
      emails.push(contact.email);
    }
  }
  return emails;
}