import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '../../../lib/mongodb';
import { Report } from '../../../models/Report';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportContent, filesScanned } = await req.json();

    if (!reportContent || filesScanned === undefined) {
      return NextResponse.json({ error: 'Missing report data' }, { status: 400 });
    }

    await dbConnect();

    const ReportModel = Report as any;
    const newReport = await ReportModel.create({
      userId,
      reportContent,
      filesScanned
    });

    return NextResponse.json({ success: true, reportId: newReport._id }, { status: 201 });
  } catch (error) {
    console.error('Save Report DB Error:', error);
    return NextResponse.json({ error: 'Failed to save report' }, { status: 500 });
  }
}
