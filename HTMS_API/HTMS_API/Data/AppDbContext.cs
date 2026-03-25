using Microsoft.EntityFrameworkCore;
using HTMS_API.Models;

namespace HTMS_API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<Project> Projects { get; set; }
        public DbSet<ProjectMember> ProjectMembers { get; set; }
        public DbSet<TaskColumn> TaskColumns { get; set; }
        public DbSet<HTMS_API.Models.Task> Tasks { get; set; }
        public DbSet<PersonalTask> PersonalTasks { get; set; }
        public DbSet<Comment> Comments { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<Attachment> Attachments { get; set; }
        public DbSet<TaskActivityLog> TaskActivityLogs { get; set; }
        public DbSet<ProjectActivityLog> ProjectActivityLogs { get; set; }
        public DbSet<ProjectFile> ProjectFiles { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<ProjectMember>()
                .HasKey(pm => new { pm.ProjectId, pm.UserId });

            modelBuilder.Entity<User>().ToTable("User");
            modelBuilder.Entity<Role>().ToTable("Role");
        }
    }
}