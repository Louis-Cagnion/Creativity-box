/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   time_for_chomage_left.c                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: marvin <marvin@student.42.fr>              +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/13 11:44:21 by marvin            #+#    #+#             */
/*   Updated: 2025/08/30 14:43:01 by marvin           ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/* Reset all text formatting */
# ifndef RESET
#  define RESET				"\033[0m"
# endif

/* Cyan text */
# ifndef CYAN
#  define CYAN				"\033[36m"
# endif

/* Green text */
# ifndef GREEN
#  define GREEN				"\033[32m"
# endif

/* Bold text */
# ifndef BOLD
#  define BOLD				"\033[1m"
# endif

/* Underlined text */
# ifndef UNDERLINE
#  define UNDERLINE			"\033[4m"
# endif

/* Red text */
# ifndef RED
#  define RED				"\033[31m"
# endif

/* Red text */
# ifndef T_DAY
#  define T_DAY				24 * 60 * 60
# endif

#include <stdio.h>
#include <math.h>
#include <time.h>
#include <stdbool.h>

size_t contract_nb;

int	get_decimal(double time)
{
	int decimal = (int)((time - (int)time) * 100);
	if (decimal % 10 == 9 || decimal == 44 || decimal == 14)
		decimal++;
	return (decimal);
}

void	time_left(int limit_d, double limit_h)
{
	char msgd[50] = GREEN " 0d !", msgh[50] = GREEN " 0d !";

	if (limit_d > 0)
		snprintf(msgd, sizeof(msgd), " %dd", limit_d);
	if (limit_h > 0)
		snprintf(msgh, sizeof(msgh), " %dh%02d", (int)limit_h, get_decimal(limit_h));
	printf(BOLD UNDERLINE"\nJours restants pour le chomage :"RESET "%s\n"CYAN BOLD UNDERLINE"Heures restantes pour le chomage :"RESET "%s\n"RESET, msgd, msgh);
}


void print_hours_worked(char *colour, double how, double nb)
{
	int decimal;

	if (colour)
	{
		printf(RESET"%s", colour);
		decimal = get_decimal(how);
		if (!how)
			printf("       /      ");
		else if (!decimal || decimal == 100)
			printf("       %dh     ", (int)(how + 0.01));
		else
			printf("      %dh%02d    ", (int)how, decimal);
		if ((int)how >= 10)
			printf(CYAN"|");
		else
			printf(CYAN" |");
	}
	else
	{
		printf(GREEN);
		decimal = get_decimal(nb);
		if (!decimal || decimal == 100)
			printf("  %dh  ", (int)(nb + 0.01));
		else
			printf(" %dh%02d ", (int)nb, decimal);
		if (nb >= 10)
			printf(CYAN"|");
		else
			printf(CYAN" |");
	}
}

/**
 * @brief
 * Write a formated date as follow :
 * dd/mm/yy
 * 
 * @param date_str	The string that will receive the formated date
 * @param size		The size of `date_str`
 * @param cur_date	The current date to format
 */
void	formated_date(char *date_str, size_t size, time_t cur_date)
{
	struct tm tm_day = *localtime(&cur_date);
	strftime(date_str, size, "%d/%m/%y", &tm_day);
}

/**
 * @brief
 * print blank days if the starting day is not monday.
 * 
 * @param start_day			The starting day
 * @param days				The string tab of days
 * @param i					The last week
 * @param how				The hours of work array
 * @param limit_h			The limit of hours to reach
 * @param date_str			The string that will receive the date format
 * @param contract_dates	The contract starting dates
 * @param contract_nb		The global variable that represents the number of contracts
 * @param contract			The current contract
 */
void	blank_print(int start_day, char *days[8], int i, double *how, double *limit_h, char *date_str, time_t contract_dates[contract_nb], size_t contract, int cur_j)
{
	if (!start_day)//monday start
		return ;
	printf(CYAN"─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────\n|");
	for (int j = 0; j < 7; j++)
	{
		formated_date(date_str, sizeof(date_str), contract_dates[contract]);//transform the current date to a readable date
		printf(" "BOLD"%s %s"RESET CYAN" |", days[j], date_str);//day. day_nb/month_nb/year_nb
		contract_dates[contract] += T_DAY;
	}
	printf(" "BOLD"%s"RESET CYAN" |", days[7]);//display "Total"
	printf("\n─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────\n");
	printf("|               |               |               |               |               |               |               |       |\n|");
	double total_h_week = 0;
	for (int j = 0; j < 7; j++)
	{
		if (get_decimal(how[i + j]) >= 60)//avoid overlap of base 60
			how[i + j] -= 0.40;
		if (j >= start_day)
			printf("               |");
		else if (cur_j == -1 || j < cur_j)//basically writing in green if i'm not above today's date
		{
			print_hours_worked(GREEN, how[i + j], 0);
			*limit_h -= how[i + j];//remove hours left as long as today's day is not overlaped
			if (get_decimal(*limit_h) >= 60)//avoid overlap of base 60
				*limit_h -= 0.40;
		}
		else//else red
			print_hours_worked(RED, how[i + j], 0);
		total_h_week += how[i + j];//add hours to the total of the week
		if (get_decimal(total_h_week) >= 60)//avoid overlap of base 60
			total_h_week += 0.40;
	}
	print_hours_worked(NULL, 0, total_h_week);//print total hours worked this week
	printf("\n|               |               |               |               |               |               |               |       |\n");
	i += 7;
	printf("─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────\n");
}

/**
 * @brief
 * Displays the working hours sheddule of different contracts and the total hours worked per week.
 * 
 * @param how The hours of work array
 * @param start_day The day the contract started
 * @param limit_d The days to reach for chomage
 * @param limit_h The hours to reach for chomage
 * @param contract_dates The contract starting dates
 * @param contract_nb The global variable that represents the number of contracts
 */
void	how_much_time_left(double *how, int start_day, int limit_d, double limit_h, time_t contract_dates[contract_nb])
{
	bool conds[3] = {!how, start_day < 0, contract_nb <= 0};
	char *msgs[3] = {"Error : NULL hours of work\n", "Error : Invalid starting day.\n", "No contracts to display.\n"};
	for (int i = 0; i < 3; i++)//invalid arguments check
		if (conds[i])
			return (void)printf(RED"%s"RESET, msgs[i]);

	size_t	contract = 0;
	bool	first_week = true;
	int 	rest_days = 0,
			cur_j = -1,
			cur_days = limit_d + start_day + 3,
			i = start_day;
	char	date_str[9] = {0},
			*days[8] = {"Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim.", "Total"};

	while (contract < contract_nb)
	{
		if (!how[i] && !how[i + 1] && !how[i + 2])//if there's 3 days off, it's the end of a contract
		{
			if (contract < contract_nb - 1)//goes to the next contract
			{
				contract++;
				first_week = true;
				i += 7;
				printf(CYAN"─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────\n");
				printf("|                                                        .....                                                          |\n");
				continue;
			}
			break ;//end of the contacts
		}
		time_t now = time(NULL);//get the current day
		printf(CYAN"─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────\n|");
		for (int j = 0; j < 7; j++)//display the days of the week
		{
			if (!how[i + j])//if it's a day off
			{
				rest_days++;
				cur_days++;
			}
			else if (contract_dates[contract] + T_DAY * (j - 3) <= now)//if the date is not above the today date
				limit_d--;
			formated_date(date_str, sizeof(date_str), contract_dates[contract]);//transform the current date to a readable date
			printf(" "BOLD"%s %s"RESET CYAN" |", days[j], date_str);//day. day_nb/month_nb/year_nb
			if (cur_j == -1 && contract_dates[contract] > now)//search for the day where i go above today's day
        		cur_j = j;
			contract_dates[contract] += T_DAY;
		}
		printf(" "BOLD"%s"RESET CYAN" |", days[7]);//display "Total"
		printf("\n─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────\n");
		printf("|               |               |               |               |               |               |               |       |\n|");
		double total_h_week = 0;
		for (int j = 0; j < 7; j++)
		{
			if (first_week && j < start_day)//print empty days if starting day is not monday
			{
				while (j++ < start_day)
					printf("               |");
				j--;
			}
			if (get_decimal(how[i + j]) >= 60)//avoid overlap of base 60
				how[i + j] -= 0.40;
			if (cur_j == -1 || j < cur_j)//basically writing in green if i'm not above today's date
			{
				print_hours_worked(GREEN, how[i + j], 0);
				limit_h -= how[i + j];//remove hours left as long as today's day is not overlaped
				if (get_decimal(limit_h) >= 60)//avoid overlap of base 60
					limit_h -= 0.40;
			}
			else//else red
				print_hours_worked(RED, how[i + j], 0);
			total_h_week += how[i + j];//add hours to the total of the week
			if (get_decimal(total_h_week) >= 60)//avoid overlap of base 60
				total_h_week += 0.40;
		}
		cur_j = -1;
		print_hours_worked(NULL, 0, total_h_week);//print total hours worked this week
		printf("\n|               |               |               |               |               |               |               |       |\n");
		i += 7;
		first_week = false;//set first week to false after going through one lap/week
	}
	printf("─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────\n");
	blank_print(start_day, days, i, how, &limit_h, date_str, contract_dates, contract, cur_j);
	time_left(limit_d, limit_h);
}

#include <time.h>

int	day(char *s)
{
	if (s[0] == 'L' || s[0] == 'l')
		return (0);
	else if ((s[0] == 'M' || s[0] == 'm') && s[1] == 'a')
		return (1);
	else if ((s[0] == 'M' || s[0] == 'm') && s[1] == 'e')
		return (2);
	else if (s[0] == 'J' || s[0] == 'j')
		return (3);
	else if (s[0] == 'V' || s[0] == 'v')
		return (4);
	else if (s[0] == 'S' || s[0] == 's')
		return (5);
	else if (s[0] == 'D' || s[0] == 'd')
		return (6);
	return (-1);
}

/**
 * @brief
 * The function convert a date into a time_t
 * 
 * it also validates the date:
 * 
 * - Checks that day, month, and year are in valid ranges
 * 
 * - Handles February correctly with leap years
 * 
 * - Supports leap years according to the Gregorian calendar rules
 * 
 * If the date is invalid, the function prints an error message and returns (time_t)-1.
 * 
 * @param day	The day
 * @param month	The month
 * @param year	The year
 * 
 * @returns the date as a time_t
 */
time_t get_date_time_t(int day, int month, int year)
{
	int mdays[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};

	if (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0))
		mdays[1] = 29;
	if (month < 1 || month > 12 || day < 1 || day > mdays[month-1] || year < 1900)
		return printf(RED "Invalid date!\n" RESET), (time_t)-1;

	struct tm start = {
		.tm_mday = day,
		.tm_mon = month - 1,	// (0 = january)
		.tm_year = year - 1900,	// year (count since 1900)
		.tm_hour = 12,			// security against hour change
		.tm_isdst = -1			// let mktime determine whether Daylight Saving Time (DST) applies
	};

    return mktime(&start);// convert to time_t in seconds since 1970
}

/**
 * @brief
 * Calculate the time for french Chomage left based on the requirements before the new law that come out in june 2025.
 * 
 * it gives you the current days and hours of work you need to fullfill to get your access to chomage.
 * 
 * @note You only need to meet one requirement to get access to it.
 * @note The hours of work tab should always end with a line of 0 to stop the loop.
 * @note If you need to add multiple starting dates, add one below and in the tab you send to the function.
 */
int	main(void)
{
	int limit_days = 65;
	double limit_hours = 455;
	time_t start_date_lidl = get_date_time_t(16, 05, 2025);
	time_t start_date_KFC = get_date_time_t(16, 02, 2026);
	contract_nb = 2;
	double hours_of_work[] = {
		(17 - 14 + 13 - 9), (17 - 14 + 13 - 9), (19.3 - 14), (19.3 - 14), (19 - 14), 0, 0,
		(20.35 - 14.31), 0, 0, (20.46 - 12.47), (20.42 - 14.3), (20.49 - 14.31), (20.3 - 14.3),
		(22 - 16), (22.11 - 13.51), (22.21 - 12.04), (24 - 16), 0, (22.19 - 16), 0,
		(22.09 - 16), (22.36 - 15.57), (22.46 - 16), (23.04 - 16), 0, (23.45 - 16), 0,
		(23.04 - 16.59), (23.13 - 16.59), (24.19 - 14.49), (23.40 - 15.26), 0, (22.55 - 16.59), 0,
		(23.03 - 17.03), (23.06 - 16.59), (24.20 - 17.01), (23.27 - 16), 0, (24.08 - 17), 0,
		(23.20 - 17), (23.44 - 17), (23.54 - 17), (23.56 - 17), 0, (23.53 - 17), 0,
		(24.08 - 17), (23.51 - 14.54), (24.26 - 17.1), (24.14 - 16.57), 0, (23.39 - 14.29), 0,
		(24 - 15.13), (24.03 - 17), (24.31 - 17.01), (24.01 - 17), 0, (23.34 - 16.57), 0,
		(23.27 - 17), (23.06 - 17), (22.53 - 16.59), (23.14 - 17.02), 0, (23.14 - 17.02), 0,
		(22.17 - 16), (22.1 - 16), (22.24 - 16.02), (22.21 - 16.01), (22.22 - 16.01), 0, 0,
		0, 0, 0, 0, 0, 0, 0,
		((24 - 21.30) + (21 - 17)), (23.45 - 18), 0, 0, (24.27 - 18), ((25.05 - 18) + (14.15 - 12)), ((23.55 - 19) + (15 - 12)),
		(23.45 - 18), (24.30 - 19), 0, 0, (22.24 - 19), ((25.06 - 19) + (15 - 12)), ((24.46 - 19) + (14.30 - 12)),
		(24.07 - 19), (23.45 - 19), 0, 0, (21.16 - 16), ((23.45 - 19) + (14.05 - 12)), (23.50 - 18),
		((23.45 - 19) + (14.33 - 12.17)), (14.30 - 12), 0, 0, (23.50 - 18), (17 - 12), (15 - 12),
		((23.25 - 19) + (14 - 12)), (14 - 12), 0, 0, (24.18 - 18.58), ((24.23 - 18)), ((23.45 - 19) + (14.01 - 12)),
		(16 - 12), (24.26 - 18), 0, 0, (24.14 - 19), (14 - 12), (23.53 - 19.03),
		((20.04 - 18.01) + (14.09 - 12.03)), (14.10 - 12), 0, 0, (23.53 - 19), ((24.20 - 19) + (14.45 - 12)) - 0.2, ((23.45 - 19) + (14.15 - 12)),
		((24.20 - 18)), (23.35 - 19), 0, 0, (17 - 12), (23.45 - 18.30), (23.45 - 19),
		0, 0, 0, 0, 0, 0, 0,
	};

	time_t contracts[] = {start_date_lidl, start_date_KFC};
	how_much_time_left(hours_of_work, day("lundi"), limit_days, limit_hours, contracts);
	return (0);
}
