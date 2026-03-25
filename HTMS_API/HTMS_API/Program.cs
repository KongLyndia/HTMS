using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using HTMS_API.Data;
using HTMS_API.Hubs;
using HTMS_API.Services;
using HTMS_API.Services.Interfaces;

namespace HTMS_API
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // ── 1. DATABASE ───────────────────────────────────────────
            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(
                    builder.Configuration.GetConnectionString("DefaultConnection")));

            // ── 2. DI SERVICES ────────────────────────────────────────
            builder.Services.AddScoped<IAuthService, AuthService>();
            builder.Services.AddScoped<IProjectService, ProjectService>();
            builder.Services.AddScoped<INotificationService, NotificationService>();
            builder.Services.AddScoped<IDashboardService, DashboardService>();
            builder.Services.AddScoped<ICloudinaryService, CloudinaryService>();
            builder.Services.AddScoped<IProjectActivityService, ProjectActivityService>();
            builder.Services.AddScoped<IMyTasksService, MyTasksService>();

            // ── 3. CORS ───────────────────────────────────────────────
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowReact", policy =>
                {
                    policy
                        .WithOrigins(
                            "http://localhost:5173",
                            "https://localhost:5173",
                            "http://localhost:3000"
                        )
                        .AllowAnyHeader()
                        .AllowAnyMethod()
                        .AllowCredentials(); // bắt buộc cho SignalR WebSocket
                });
            });

            // ── 4. JWT ────────────────────────────────────────────────
            var jwtSettings = builder.Configuration.GetSection("Jwt");
            var key = Encoding.UTF8.GetBytes(
                jwtSettings["Key"] ?? throw new Exception("JWT Key missing in appsettings.json"));

            builder.Services
                .AddAuthentication(o =>
                {
                    o.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                    o.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                    o.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
                })
                .AddJwtBearer(o =>
                {
                    o.RequireHttpsMetadata = false;
                    o.SaveToken = true;
                    o.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = jwtSettings["Issuer"],
                        ValidAudience = jwtSettings["Audience"],
                        IssuerSigningKey = new SymmetricSecurityKey(key),
                        ClockSkew = TimeSpan.Zero,
                    };

                    // SignalR gửi token qua query string ?access_token=
                    o.Events = new JwtBearerEvents
                    {
                        OnMessageReceived = ctx =>
                        {
                            var token = ctx.Request.Query["access_token"];
                            var path = ctx.HttpContext.Request.Path;
                            if (!string.IsNullOrEmpty(token) &&
                                path.StartsWithSegments("/hubs"))
                            {
                                ctx.Token = token;
                            }
                            return System.Threading.Tasks.Task.CompletedTask;
                        }
                    };
                });

            // ── 5. SIGNALR ────────────────────────────────────────────
            builder.Services.AddSignalR();

            // ── 6. CONTROLLERS + SWAGGER ──────────────────────────────
            builder.Services.AddControllers()
                .AddJsonOptions(opts =>
                {
                    // Serialize PascalCase C# properties → camelCase JSON
                    opts.JsonSerializerOptions.PropertyNamingPolicy =
                        System.Text.Json.JsonNamingPolicy.CamelCase;
                    opts.JsonSerializerOptions.DictionaryKeyPolicy =
                        System.Text.Json.JsonNamingPolicy.CamelCase;
                });
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "HTMS API", Version = "v1" });
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Description = "Nhập: Bearer {token}",
                    Name = "Authorization",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.ApiKey,
                    Scheme = "Bearer",
                });
                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {{
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
                    },
                    Array.Empty<string>()
                }});
            });

            // ═══════════════════════════════════════════════════════════
            var app = builder.Build();

            // Auto-migrate DB khi startup
            using (var scope = app.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                try { db.Database.Migrate(); }
                catch (Exception ex)
                {
                    var log = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
                    log.LogError(ex, "Migration failed: {Message}", ex.Message);
                }
            }

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            // Global error handler
            app.UseExceptionHandler(errApp =>
            {
                errApp.Run(async ctx =>
                {
                    var ex = ctx.Features
                        .Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
                    ctx.Response.ContentType = "application/json";
                    ctx.Response.StatusCode = ex is UnauthorizedAccessException ? 403 : 500;
                    var isDev = app.Environment.IsDevelopment();
                    await ctx.Response.WriteAsJsonAsync(new
                    {
                        message = ex?.Message ?? "Lỗi không xác định",
                        stackTrace = isDev ? ex?.StackTrace : null,
                    });
                });
            });

            app.UseHttpsRedirection();
            // Serve file local (fallback khi Cloudinary chưa config)
            app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(
                    Path.Combine(builder.Environment.ContentRootPath, "wwwroot")),
                RequestPath = ""
            });

            // ── Thứ tự middleware QUAN TRỌNG ──────────────────────────
            app.UseCors("AllowReact");       // 1. CORS — phải trước auth
            app.UseAuthentication();          // 2. Xác thực JWT
            app.UseAuthorization();           // 3. Phân quyền

            app.MapControllers();
            app.MapHub<NotificationHub>("/hubs/notifications");
            app.MapHub<BoardHub>("/hubs/board");

            app.Run();
        }
    }
}