import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function createProjectForMatan() {
  try {
    // Get Matan's user
    const user = await prisma.user.findUnique({
      where: { email: 'matan@ec-exhibits.com' }
    });

    if (!user) {
      console.error('❌ User not found: matan@ec-exhibits.com');
      process.exit(1);
    }

    console.log('✅ Found user:', user.displayName, `(${user.email})`);

    // Create a project
    const projectId = randomUUID();
    const project = await prisma.project.create({
      data: {
        id: projectId,
        name: 'Tech Expo 2025',
        show: 'CES Las Vegas',
        size: '20x30 ft',
        moveInDate: new Date('2025-01-10'),
        openingDay: new Date('2025-01-12'),
        description: 'Interactive technology exhibit with digital displays and demo stations',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ Created project:', project.name);

    // Add user as project member (owner)
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: user.id,
        role: 'owner'
      }
    });

    console.log('✅ Added you as project owner');

    // Create project stages (Standard 5-stage workflow)
    const stages = [
      { slug: 'planning', name: 'Planning', description: 'Project kickoff and planning phase', position: 0 },
      { slug: 'production', name: 'Production', description: 'Build and fabrication phase', position: 1 },
      { slug: 'shipping', name: 'Shipping', description: 'Logistics and transportation', position: 2 },
      { slug: 'installation', name: 'Installation', description: 'On-site setup and installation', position: 3 },
      { slug: 'closeout', name: 'Closeout', description: 'Final walkthrough and project completion', position: 4 }
    ];

    for (const stage of stages) {
      await prisma.stage.create({
        data: {
          projectId: project.id,
          templateSlug: stage.slug,
          name: stage.name,
          description: stage.description,
          position: stage.position,
          status: stage.position === 0 ? 'in_progress' : 'not_started'
        }
      });
    }

    console.log('✅ Created 5 project stages');

    console.log('\n🎉 Success! Project created for matan@ec-exhibits.com');
    console.log(`   Project ID: ${project.id}`);
    console.log(`   Project Name: ${project.name}`);
    console.log(`   Refresh your dashboard to see it!`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createProjectForMatan();
